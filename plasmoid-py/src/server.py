import asyncio
import base64
import collections
import json
from asyncio import Queue, Event, sleep, Task, CancelledError
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any, Self
from uuid import UUID

import httpx
# import uvicorn
from asyncio_pool import AioPool
from datauri import DataURI
from uuid_v7.base import uuid7

from sanic import Sanic, json as jsonr, Request, Websocket
from sanic.log import logger


class AppQueue(Queue):
    def __init__(self, maxsize=0):
        super().__init__(maxsize)
        self.workers: AioPool | None = None
        self.stop_event: Event = Event()
        self.task: Task | None = None
        self.processed: list['PlannedRequest'] = []
        self._queue = collections.deque()

    @property
    def pending(self):
        return self._queue

    def remove_by_id(self, id: str):
        id = UUID(id)
        for task in self._queue:  # type: PlannedRequest
            if task.id == id:
                if task.status == RequestStatus.PROCESSING:
                    logger.warning(f'Cannot remove task {id} while it is processing')
                    return None
                self._queue.remove(task)
                return task
        for task in self.processed:
            if task.id == id:
                self.processed.remove(task)
                return task
        return None

    def cleanup_old(self):
        self.processed = self.processed[:21]


app = Sanic(__name__)
queue = AppQueue()
websockets = set()
UPLOAD_DIR = Path(__file__).parent.parent / 'uploads'


@app.before_server_start
async def init(_):
    queue.workers = AioPool(10)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    for file in UPLOAD_DIR.glob('*.json'):
        with open(file, 'r') as f:
            data = json.load(f)
            planned_request = PlannedRequest.from_json(data)
            await planned_request.add_to_queue()


async def queue_worker():
    try:
        while not queue.stop_event.is_set():
            planned_request = await queue.get()
            await queue.workers.spawn(planned_request.handle())
            queue.task_done()
    except CancelledError:
        logger.warning('Queue worker stopped')


@app.after_server_start
async def start_worker(_):
    queue.task = asyncio.create_task(queue_worker())


@app.before_server_stop
async def stop_worker(_):
    queue.stop_event.set()
    queue.task.cancel()
    # await asyncio.wait_for(queue.task, None)


class RequestMethod(Enum):
    POST_GIF = 'gif'
    POST_PHOTO_URL = 'photo.url'
    POST_PHOTO_FILE = 'photo.file'


class RequestStatus(Enum):
    QUEUED = 'queued'
    PROCESSING = 'processing'
    COMPLETED = 'completed'
    DUPLICATE = 'duplicate'
    FAILED = 'failed'
    REMOVED = 'removed'


@dataclass
class PlannedRequest:
    id: UUID
    method: RequestMethod
    endpoint: str
    url: str | None = None
    file: str | None = None
    retries: int = 0
    status: RequestStatus = RequestStatus.QUEUED

    @staticmethod
    def from_json(data: dict[str, Any]) -> 'PlannedRequest':
        return PlannedRequest(
            id=UUID(data['id']),
            method=RequestMethod(data['method']),
            endpoint=data['endpoint'],
            url=data.get('url'),
            file=data.get('file'),
            retries=data.get('retries', 0)
        )

    def to_json(self, with_data_uri=False) -> dict[str, Any]:
        return {
            'id': str(self.id),
            'method': self.method.value,
            'endpoint': self.endpoint,
            'url': self.url,
            'file': DataURI.make('image/jpeg', None, True, open(self.file, 'rb').read()) if with_data_uri and self.file else None,
            'retries': self.retries,
            'status': self.status.value,
        }

    async def add_to_queue(self, retry: bool = False):
        with open(UPLOAD_DIR / f'{self.id}.json', 'w') as file:
            json.dump(self.to_json(), file)

        if retry:
            await sleep(5)
        await queue.put(self)
        self.notify_websockets()

    async def _notify_websockets(self):
        data = self.to_json(True)
        for ws in websockets:
            try:
                await ws.send(json.dumps({
                    'type': 'task_update',
                    'task': data,
                }))
            except Exception as e:
                logger.error(f'Error sending message to WebSocket: {e}')

    def notify_websockets(self):
        asyncio.get_event_loop().create_task(self._notify_websockets())

    async def handle(self):
        logger.warning(f'Processing request {self.id} [{self.method.value}]')
        self.status = RequestStatus.PROCESSING
        self.notify_websockets()
        try:
            response = None
            if self.method == RequestMethod.POST_GIF:
                async with httpx.AsyncClient(timeout=60) as client:
                    r = await client.post(self.endpoint,
                                          json={
                                              "method": "post_gif",
                                              "params": [self.url],
                                              "jsonrpc": "2.0",
                                              "id": 0,
                                          })
                    response = r.json()
            elif self.method == RequestMethod.POST_PHOTO_URL:
                async with httpx.AsyncClient(timeout=60) as client:
                    r = await client.post(self.endpoint,
                                          json={
                                              "method": "post_photo",
                                              "params": [self.url, False],
                                              "jsonrpc": "2.0",
                                              "id": 0,
                                          })
                    response = r.json()
            elif self.method == RequestMethod.POST_PHOTO_FILE:
                async with httpx.AsyncClient(timeout=60) as client:
                    with open(self.file, 'rb') as file:
                        b64 = base64.b64encode(file.read()).decode()
                        id_ = {
                            "method": "post_photo",
                            "params": [b64, True],
                            "jsonrpc": "2.0",
                            "id": 0,
                        }
                        r = await client.post(self.endpoint,
                                              json=id_)
                        response = r.json()
            else:
                logger.error(f'Unknown method: {self.method}')
                return
            logger.warning(f'Response for request {self.id}: {response}')
            match response['result']:
                case True:
                    self.status = RequestStatus.COMPLETED
                    self.notify_websockets()
                    logger.warning(f'Request {self.id} processed successfully')
                    (UPLOAD_DIR / f'{self.id}.json').unlink(True)
                case 'duplicate':
                    self.status = RequestStatus.DUPLICATE
                    self.notify_websockets()
                    logger.warning(f'Request {self.id} is a duplicate, skipping')
                    (UPLOAD_DIR / f'{self.id}.json').unlink(True)
                case _:
                    self.status = RequestStatus.FAILED
                    self.notify_websockets()
                    logger.error(f'Request {self.id} failed: {response}')

            queue.processed.insert(0, self)
        except Exception as e:
            logger.exception(e)
            self.retries += 1
            await self.add_to_queue(True)


@app.route('/forward/<endpoint:path>', methods=['POST'])
async def forward_request(request, endpoint: str):
    data = request.json
    if not data:
        return {'status': 'error', 'message': 'No data provided.'}, 400

    method = data.get('method')
    args = data.get('params', [])

    id = UUID(int=uuid7().int)

    match method:
        case 'post_photo':
            if not args or not isinstance(args, list) or len(args) != 2 or not isinstance(args[0], str) or not isinstance(args[1], bool):
                return jsonr({'status': 'error', 'message': 'Invalid parameters for post_photo.'}, 400)
            url, is_base64 = args
            if is_base64:
                b = base64.b64decode(url)
                file_path = UPLOAD_DIR / f'{id}.jpg'
                with open(file_path, 'wb') as file:
                    file.write(b)

                await PlannedRequest(
                    id,
                    RequestMethod.POST_PHOTO_FILE,
                    endpoint,
                    file=str(file_path)
                ).add_to_queue()

                logger.warning(f'POST base64 photo {file_path} -> {id}')
            else:
                await PlannedRequest(
                    id,
                    RequestMethod.POST_PHOTO_URL,
                    endpoint,
                    url=url
                ).add_to_queue()
                logger.warning(f'POST photo URL {url} -> {id}')
        case 'post_gif':
            if not args or not isinstance(args, list) or not isinstance(args[0], str):
                return jsonr({'status': 'error', 'message': 'Invalid parameters for post_gif.'}, 400)
            url, = args
            await PlannedRequest(
                id=id,
                method=RequestMethod.POST_GIF,
                endpoint=endpoint,
                url=url,
            ).add_to_queue()
            logger.warning(f'POST GIF {url} -> {id}')
        case _:
            return jsonr({'status': 'error', 'message': f'Unknown method: {method}'}, 400)

    return jsonr({'status': 'queued', 'id': str(id), 'endpoint': endpoint, 'result': True})


@app.websocket('/ws')
async def websocket_handler(request: Request, ws: Websocket):
    logger.info('WebSocket connection established')
    websockets.add(ws)

    async def send_task_list():
        await ws.send(json.dumps({
            'type': 'task_list',
            'queued': [task.to_json(True) for task in queue.pending],
            'processed': [task.to_json(True) for task in queue.processed],
        }))

    try:
        while True:
            msg = await ws.recv()
            data = json.loads(msg)
            type_ = data.get('type')
            if type_ == 'ping':
                await ws.send('pong')
            elif type_ == 'get_tasks':
                await send_task_list()
            elif type_ == 'clear_tasks':
                queue.processed = [task for task in queue.processed if task.status in (RequestStatus.COMPLETED, RequestStatus.DUPLICATE)]
                await send_task_list()
            elif type_ == 'remove_task':
                task = queue.remove_by_id(data['id'])
                if task:
                    task.status = RequestStatus.REMOVED
                    task.notify_websockets()
            else:
                logger.warning(f'Unknown WebSocket message: {msg}')
    except Exception as e:
        logger.error(f'WebSocket error: {e}')
    finally:
        logger.info('WebSocket connection closed')
        websockets.remove(ws)


if __name__ == '__main__':
    app.run(port=5000, single_process=True)
    # uvicorn.run(app, port=5000, log_level="info", lifespan="on")
