#!/usr/bin/env python3

import requests
import json
import pysftp

release_data = requests.get('https://api.github.com/repos/bakatrouble/image-galleries-extension/releases/latest').json()
release_version = release_data['tag_name']
release_url = release_data['assets'][0]['browser_download_url']

package = json.load(open('package.json'))
package_version = package['version']

if release_version != package_version:
    print('Release was not updated yet')
    exit(1)

with pysftp.Connection('bakatrouble.me', username='root') as sftp:
    sftp.get('/srv/apps/drop/subdomain_files/booru/manifest.json', 'manifest.json')

    manifest = json.load(open('manifest.json'))
    manifest['addons']['booru@bakatrouble.me']['updates'].append({
        'version': release_version,
        'update_link': release_url,
    })
    json.dump(manifest, open('manifest.json', 'w'), indent=4)

    sftp.put('manifest.json', '/srv/apps/drop/subdomain_files/booru/manifest.json')
