#!/usr/bin/env python3

import requests
import json
import pysftp
import logging
from halo import Halo
from colorama import Fore
from pprint import pprint

from time import sleep

def wait_for_release():
    while True:
        release_data = requests.get('https://api.github.com/repos/bakatrouble/image-galleries-extension/releases/latest').json()
        pprint(release_data)
        if 'tag_name' in release_data:
            release_version = release_data['tag_name']
            release_url = release_data['assets'][0]['browser_download_url']

            package = json.load(open('package.json'))
            package_version = package['version']

            if release_version == package_version:
                return release_version, release_url
        sleep(10)


def main():
    spinner = Halo(text='Waiting for new release', spinner='dots')
    spinner.start()
    release_version, release_url = wait_for_release()
    spinner.succeed()
    spinner.start('Downloading manifest')
    with pysftp.Connection('bakatrouble.me', username='root') as sftp:
        # download manifest
        sftp.get('/srv/apps/drop/subdomain_files/booru/manifest.json', 'manifest.json')
        spinner.succeed()

        # load manifest
        spinner.start('Updating manifest')
        manifest = json.load(open('manifest.json'))
        updates = manifest['addons']['booru@bakatrouble.me']['updates']

        # check whether current version is already in the manifest
        versions = set(update['version'] for update in updates)
        if release_version in versions:
            spinner.fail(f'Updating manifest: Version `{release_version}` is already in the manifest')
            return

        # add current version to manifest
        updates.append({
            'version': release_version,
            'update_link': release_url,
        })
        json.dump(manifest, open('manifest.json', 'w'), indent=4)
        spinner.succeed()

        # upload
        spinner.start('Uploading manifest')
        sftp.put('manifest.json', '/srv/apps/drop/subdomain_files/booru/manifest.json')
        spinner.succeed()


if __name__ == '__main__':
    main()

