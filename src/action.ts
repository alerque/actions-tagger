import * as core from "@actions/core";
import * as github from "@actions/github";
import semverGte from "semver/functions/gte";
import {
    isSemVersionedRelease,
    isPublishedRelease,
    releaseTag,
    findLatestReleases,
    createRequiredRefs,
    isEditedRelease,
} from "./functions";
import { preferences } from ".";

function ifErrorSubmitBug() {
    core.info("If you believe this to be an error, please submit a bug report");
    core.info("https://github.com/Actions-R-Us/actions-tagger/issues");

    if (core.isDebug()) {
        core.debug(`event: ${process.env.GITHUB_EVENT_NAME}`);
        core.debug(`tag_name: ${releaseTag().version}`);
    }
}

function outputRefName(refName: string) {
    core.setOutput("ref_name", refName);
}

function outputLatest(isLatest: boolean) {
    core.setOutput("latest", isLatest.toString());
}

async function run() {
    try {
        if (!isPublishedRelease() && !isEditedRelease()) {
            core.info("This action should only be used in a release context");
            ifErrorSubmitBug();
            return;
        }

        if (!isSemVersionedRelease()) {
            core.info("This action can only operate on semantically versioned releases");
            ifErrorSubmitBug();
            return;
        }

        let token = core.getInput('token');
        if (process.env.GITHUB_TOKEN) {
            token = process.env.GITHUB_TOKEN;
            core.info(
                "Using obsolete GITHUB_TOKEN environment variable, please set an input
                value instead. In most cases the default value will just work and you can
                simply remove the token variable from your configuration.”
            );
        }
        const octokit = github.getOctokit(token);
        const { repoLatest, majorLatest } = await findLatestReleases(octokit);

        const releaseVer = releaseTag();

        if (semverGte(releaseVer, majorLatest)) {
            const overridePubLatest =
                preferences.publishLatestTag && semverGte(releaseVer, repoLatest);

            const { ref, latest } = await createRequiredRefs(
                octokit,
                overridePubLatest
            );
            outputRefName(ref);
            outputLatest(latest);
        } else {
            core.info(
                "Nothing to do because release commit is earlier than major tag commit"
            );
            ifErrorSubmitBug();
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
