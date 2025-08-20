import { existsSync, openAsBlob } from 'node:fs';
import path from 'node:path';
import { type CliOptions, Command, Option, runExit } from 'clipanion';
import jwt from 'jwt-simple';
import ky, { HTTPError } from 'ky';
import shellJS from 'shelljs';
import yoctoSpinner from 'yocto-spinner';
import packageJson from '../package.json';
import { extensionSlug } from '../wxt.config';
import 'dotenv/config';

const getAuth = (key: string, secret: string) => {
    const issueTime = Math.floor(+new Date() / 1000);
    return jwt.encode(
        {
            iss: key,
            jti: Math.random().toString(),
            iat: issueTime,
            exp: issueTime + 300,
        },
        secret,
    );
};

interface Upload {
    uuid: string;
    channel: 'listed' | 'unlisted';
    processed: boolean;
    submitted: boolean;
    url: string;
    valid: boolean;
    validation?: {
        errors: number;
        warnings: number;
        notices: number;
        success: boolean;
        compatibility_summary: {
            notices: number;
            errors: number;
            warnings: number;
        };
        metadata: { listed: boolean };
        messages: any[];
        message_tree: any;
        ending_tier: number;
    };
    version: null;
}

interface Version {
    id: number;
    file: {
        id: number;
        status: 'unreviewed' | 'public';
        url: string;
    };
    reviewed: boolean;
}

class SignCommand extends Command {
    amoKey = Option.String('-k,--amo-key', {
        env: 'AMO_KEY',
        required: !process.env.AMO_KEY,
        description: 'AMO key',
    });
    amoSecret = Option.String('-s,--amo-secret', {
        env: 'AMO_SECRET',
        required: !process.env.AMO_SECRET,
        description: 'AMO secret',
    });

    spinner = yoctoSpinner();

    get client() {
        return ky.extend({
            prefixUrl: 'https://addons.mozilla.org/api/v5/addons',
            hooks: {
                beforeRequest: [
                    (req) => {
                        req.headers.set(
                            'authorization',
                            `JWT ${getAuth(this.amoKey!, this.amoSecret!)}`,
                        );
                    },
                ],
            },
        });
    }

    async upload(extensionZip: string) {
        this.spinner.start('Uploading extension zip...');
        const form = new FormData();
        form.set('channel', 'unlisted');
        form.set('upload', await openAsBlob(extensionZip), 'extension.zip');
        try {
            const upload = (await this.client
                .post('upload/', { body: form })
                .json()) as Upload;
            this.spinner.success('Zip uploaded');
            return upload.uuid;
        } catch (e) {
            this.spinner.error('Error uploading extension zip');
            if (e instanceof HTTPError) {
                console.error('response', await e.response.json());
                process.exit(1);
            }
            throw e;
        }
    }

    async waitForUploadValidation(uploadUuid: string) {
        this.spinner.start('Waiting for upload validation...');

        let stop = false;

        const stopT = setTimeout(() => {
            stop = true;
        }, 600_000);

        try {
            while (!stop) {
                await new Promise((resolve) => setTimeout(resolve, 5000));
                const upload = (await this.client
                    .get(`upload/${uploadUuid}/`)
                    .json()) as Upload;
                if (upload.processed) {
                    if (upload.valid) {
                        this.spinner.success('Upload verified');
                        return true;
                    } else {
                        this.spinner.error('Upload is not valid');
                        console.error(
                            'validation messages',
                            upload.validation?.messages,
                        );
                        return false;
                    }
                }
            }
            this.spinner.error('Upload verification timeout');
            return false;
        } finally {
            clearTimeout(stopT);
        }
    }

    async addVersion(uploadUuid: string) {
        this.spinner.start('Adding a version...');
        try {
            const version = (await this.client
                .post(`addon/${extensionSlug}/versions/`, {
                    json: {
                        upload: uploadUuid,
                    },
                })
                .json()) as Version;
            this.spinner.success('Version added');
            return version.id;
        } catch (e) {
            this.spinner.error('Error adding a version');
            if (e instanceof HTTPError) {
                console.error('response', await e.response.json());
                process.exit(1);
            }
            throw e;
        }
    }

    async waitForVersionReview(versionId: number) {
        this.spinner.start('Waiting for version review...');

        let stop = false;

        const stopT = setTimeout(() => {
            stop = true;
        }, 600_000);

        try {
            while (!stop) {
                await new Promise((resolve) => setTimeout(resolve, 5000));
                const version = (await this.client
                    .get(`addon/${extensionSlug}/versions/${versionId}/`)
                    .json()) as Version;
                switch (version.file.status) {
                    case 'unreviewed':
                        break;
                    case 'public':
                        this.spinner.success('Version reviewed');
                        console.log('Download url:', version.file.url);
                        return true;
                    default:
                        this.spinner.error(
                            `Unknown version status: ${version.file.status}`,
                        );
                        console.log(version);
                        return false;
                }
            }
            this.spinner.error('Version review timeout');
            return false;
        } catch (e) {
            if (e instanceof HTTPError) {
                console.error('response', await e.response.json());
            } else {
                this.spinner.error('Error waiting for version review');
                throw e;
            }
        } finally {
            clearTimeout(stopT);
        }
    }

    async execute() {
        const name = packageJson.name;
        const version = packageJson.version;
        const extensionZip = path.resolve(
            `.output/${name}-${version}-firefox.zip`,
        );

        const checkZips = () => existsSync(extensionZip);
        if (!checkZips()) {
            console.log('Zipping extension...');
            shellJS.exec('npm run zip:firefox');
        } else {
            console.log('Already zipped');
        }

        if (!checkZips()) {
            console.error('Failed to zip extensions');
            return;
        }

        const uploadUuid = await this.upload(extensionZip);
        if (await this.waitForUploadValidation(uploadUuid)) {
            const versionId = await this.addVersion(uploadUuid);
            await this.waitForVersionReview(versionId);
        }
    }
}

const options: Partial<CliOptions> = {
    binaryName: 'pnpm sign',
};

await runExit(options, SignCommand);
