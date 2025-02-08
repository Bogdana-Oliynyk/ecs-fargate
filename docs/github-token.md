## GitHub access token

A GitHub access token is required for CodePipeline to access your remote repositories to either synthesize CDK code, or build and publish your docker image.

For testing and/or demonstration purposes, a classic personal access token with the correct permission would allow CodePipeline to gain necessary access.

For production scenario, consider using a fine-grained token access to align with the principle of least privilege. _However, there have been [reports](https://repost.aws/questions/QUZLUAfzpAR5OJtDlqIu5c6Q/aws-codebuild-with-github-fine-grained-personal-access-tokens) on fine-grained tokens not working as expected for CodeBuild._ Since personal access token is used to test this repository, we cannot guarantee whether the fine-grained personal access tokens would work as expected.

- GitHub's docs on generating tokens: [here](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#about-personal-access-tokens)

- AWS docs on the token permissions needed for AWS to access to repositories: [here](https://docs.aws.amazon.com/codebuild/latest/userguide/access-tokens-github.html)

Also, make sure that your token allows access to the repository for AWS CDK deployment and your server. If either repository is in a different account (e.g. organization, someone else's GitHub account etc.) you will need the owner of the repository to generate an access token for you as well.
