import { type CliOptions, Command, Option, runExit } from 'clipanion';
import jwt from 'jwt-simple';
import ky from 'ky';
import yoctoSpinner from 'yocto-spinner';
import packageJson from '../package.json';
import 'dotenv/config';
import { existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import { simpleGit } from 'simple-git';
import { extensionSlug, updateManifestUrl } from '../wxt.config';

const repoUrl = 'git@github.com:bakatrouble/booru-lightbox-extension.git';

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

interface Version {
    id: number;
    file: {
        id: number;
        status: 'unreviewed' | 'public';
        url: string;
    };
    reviewed: boolean;
    version: string;
}

interface Manifest {
    addons: {
        [key: string]: {
            updates: {
                version: string;
                update_link: string;
            }[];
        };
    };
}

class ManifestCommand extends Command {
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

    async execute() {
        const name = packageJson.name;
        const version = packageJson.version;

        this.spinner.start(`Waiting for version ${version}...`);

        while (true) {
            const versions = (await this.client
                .get(`addon/${extensionSlug}/versions`, {
                    searchParams: {
                        filter: 'all_with_unlisted',
                    },
                })
                .json()) as { results: Version[] };
            for (const v of versions.results) {
                if (v.version === version) {
                    this.spinner.success(`Version ${version} found!`);
                    const updateManifest = (await ky
                        .get(updateManifestUrl)
                        .json()) as Manifest;
                    updateManifest.addons[extensionSlug].updates
                        .filter((v) => v.version !== version)
                        .push({
                            version,
                            update_link: v.file.url,
                        });
                    this.spinner.start('Updating manifest repository...');
                    if (!existsSync('.manifest-repo')) {
                        await simpleGit().clone(repoUrl, '.manifest-repo', {
                            '--branch': 'manifest',
                        });
                    } else {
                        await simpleGit('.manifest-repo').pull();
                    }
                    const git = simpleGit('.manifest-repo');
                    try {
                        await fs.writeFile(
                            '.manifest-repo/manifest.json',
                            JSON.stringify(updateManifest, null, 4),
                        );
                        await git.add('manifest.json');
                        await git.commit(`Update manifest for v${version}`);
                        await git.push();
                        this.spinner.success('Manifest updated successfully!');
                        process.exit();
                    } catch (error) {
                        this.spinner.error(
                            'Error updating manifest repository',
                        );
                        console.error(error);
                        process.exit(1);
                    }
                }
            }
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    }
}

const options: Partial<CliOptions> = {
    binaryName: 'pnpm update-manifest',
};

await runExit(options, ManifestCommand);
