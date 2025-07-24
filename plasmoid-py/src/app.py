import asyncio
import logging
import sys
from asyncio import Event
from threading import Thread

import uvicorn
from PySide6.QtCore import QObject, QThread, Slot, Signal
from PySide6.QtGui import QIcon, QFontDatabase, QAction, QPixmap
from PySide6.QtWidgets import QMainWindow, QApplication, QPushButton, QSystemTrayIcon, QMenu
from PySide6.QtAsyncio import run
from pyqttoast import Toast, ToastPosition

from server import app as sanic_app


class QtApp:
    def __init__(self):
        self.app = QApplication([])
        self.init_icon_font()
        self.tray_icon: QSystemTrayIcon | None = None
        self.tray_menu: QMenu | None = None
        self.tray_title: QAction | None = None
        self.tray_quit_action: QAction | None = None
        self.window = None
        self.sanic_thread: QThread | None = None
        self.sanic_worker: SanicWorker | None = None

    @staticmethod
    def init_icon_font():
        QFontDatabase.addApplicationFont("./materialdesignicons-webfont.ttf")
        QFontDatabase.font('Material Design Icons', 'Regular', 12)
        QIcon.setThemeName('Material Design Icons')

    def init_tray_icon(self):
        self.tray_icon = QSystemTrayIcon(QIcon.fromTheme('cloud-upload'), parent=self.app)
        self.tray_icon.setToolTip('Image Uploader')
        self.tray_icon.show()

        self.tray_menu = QMenu()
        self.tray_menu.setMinimumWidth(100)

        self.tray_title = QAction('Image uploader', icon=QIcon.fromTheme('cloud-upload'), enabled=False)

        self.tray_quit_action = QAction('Quit', icon=QIcon.fromTheme('exit-to-app'))
        self.tray_quit_action.triggered.connect(self.app.quit)

        self.tray_menu.addAction(self.tray_title)
        self.tray_menu.addSeparator()
        self.tray_menu.addAction(self.tray_quit_action)

        self.tray_show_notification = QAction('Show Notification', icon=QIcon.fromTheme('bell'))
        self.tray_show_notification.triggered.connect(self.show_notification)
        self.tray_menu.addAction(self.tray_show_notification)

        self.tray_icon.setContextMenu(self.tray_menu)

    def run(self):
        self.init_tray_icon()
        sys.exit(self.app.exec())

    def show_notification(self):
        Toast.setPosition(ToastPosition.BOTTOM_RIGHT)
        toast = Toast()
        toast.setDuration(0)
        toast.setTitle('Test title')
        toast.setText('Test text')
        toast.setIcon(QPixmap('46982451db3dfe0339d542868a837397.png'))
        toast.show()

    def start_sanic(self):
        self.sanic_thread = QThread()
        self.sanic_thread.setObjectName('sanic_thread')
        self.sanic_worker = SanicWorker()
        # self.sanic_worker.stopped.connect(self.start_sanic)
        self.sanic_worker.moveToThread(self.sanic_thread)
        self.sanic_thread.started.connect(self.sanic_worker.run)
        self.sanic_thread.finished.connect(self.sanic_worker.deleteLater)
        self.sanic_thread.start()

    def stop_sanic(self):
        if self.sanic_worker:
            self.sanic_worker.stop_event.set()
        # self.start_sanic()


class SanicWorker(QObject):
    stopped = Signal()

    def __init__(self):
        super().__init__()
        self.stop_event = Event()

    @Slot()
    def run(self):
        loop = asyncio.new_event_loop()
        config = uvicorn.Config(sanic_app, port=5000, log_level="info", lifespan="on")
        server = uvicorn.Server(config)

        async def stop_task():
            await self.stop_event.wait()
            await server.shutdown()
            self.stopped.emit()

        loop.create_task(stop_task())
        loop.run_until_complete(server.serve())
        # uvicorn.run(sanic_app, port=5000, log_level="info", lifespan="on")


class MainWindow(QMainWindow):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("My Application")
        self.resize(800, 600)

        self.btn = QPushButton("Stop", self)


def qt_main():
    app = QtApp()
    app.start_sanic()
    app.run()


if __name__ == '__main__':
    qt_main()
