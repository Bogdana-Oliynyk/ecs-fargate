## How to use this repository

### Purpose

This repository serves to demonstrate:

- How server deployment with a database could look like using AWS CDK
- Ability to deploy and teardown resources independently via stacks
- How to include server code from a different repository
- How to connect to a database in a private subnet - between the server itself and manual access
- An opportunity to experience AWS deployment using this repository as the foundation

### Navigating the repository

The code entrypoint is [aws-cdk.ts](../bin/aws-cdk.ts). This is where the stack IDs are defined when you use the `npx cdk deploy <stack-id>` command.

There are 2 environments - staging and productions. In general, staging is used as a testing ground to make sure all resources are functioning as expected before deploying to production. In this repository, we took a step further to use staging to demonstrate the ability to separate publishing docker image and server deployment if desired.

We would recommend clicking into each Stack and take a brief read-through on how the stack is defined. Do the same thing with the scripts at the root directory level. It is okay if you do not understand the code 100% - the goal here is to get a basic understanding of what the stack is trying to do at a high level.

Once you have a basic understanding of the codebase, there are a few options for the next step:

- If you are eager to test the deploy using the code in the repository, fork the repository and follow [deployment-guide.md](./deployment-guide.md) accordingly
- If you want a deeper understanding of the code, cross-reference the methods used with the AWS CDK documentation (or other applicable resources) to get a more thorough understanding of the logic
