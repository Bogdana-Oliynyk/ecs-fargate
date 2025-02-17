## Deployment Guide

### Pre-requisite

To utilize the code to deploy a server, you must have the following:

- An AWS Account and IAM user with correct permissions:
  - If you do not have one, sign up at https://aws.amazon.com
  - In addition to the root account, you will need an IAM user that has appropriate permissions for deployment. For demonstration purposes, you can simply create a user with Administrative access. In production scenario, the principle of least privilege is strongly encouraged.
- In your local environment, ensure you have these installed:
  - [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
  - [AWS Command Line Interface (CLI)](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
  - [AWS Session Manager plugin for the AWS CLI](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)
  - [AWS CDK CLI](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html)
- Fork this repository to your GitHub account (so you can use your GitHub token for access - see below)
- A GitHub token (generated from your developer settings) for AWS to access this repository.
  - See [github-token.md](./docs/github-token.md) for more information
  - Store this token in the AWS Secrets Manager, with the name `gh-token`
- A server repository which you have a GitHub token for AWS to access the repository. It can be a public or private repository
  - If the token to access server repository is different from the token above:
    - Store the additional token in the AWS Secrets Manager
    - You may need to modify the code in `CodePipelineStack` accordingly to account for a different secret name

### Local set up

- Run `npm install`
- Ensure you are authenticated with AWS - either via `aws configure` or `aws configure sso` (if SSO is enabled)
  - See [configure-aws-cli.md](./docs/configure-aws-cli.md) for more details
- In [utils.ts](./lib/utils.ts), change the server and CDK GitHub repository addresses to the repositories that you are using

### Deployment

[aws-cdk.ts](./bin/aws-cdk.ts) contains all the stacks available for deployment. **_Staging is best for experimenting ECS/Fargate optimization without excessive CodeBuild resource usage._**

There is no strict rules in terms of the stack order for deployment. The stacks are set up in a way that you can deploy most stacks independently, or the stack will also deploy other resources that the stack is dependent upon.

The syntax to deploy is `npx cdk deploy <stack-id>` (include `--profile` flag if your account has a profile name associated with it).

You can see the list of stacks using `cdk list`.

Below is an example flow of how the stacks can be deployed. You can use CloudFormation or console to monitor progress unless otherwise specified:

1. Deploy RDS: `npx cdk deploy RDSStack-Staging` (or `RDSStack-Production` for production ENV)

   - This will deploy `VPCStack` and `BastionStack` if they are not deployed
   - We recommend separate DB deployments from server deployments in general. As much as they are interconnected the resource maintenance should be done separately

2. Deploy Docker image +/- server:

- Check the location of the Dockerfile in your server repository. You may need to update filepath in the `docker build ...` command in `utils.ts::dockerBuildCommands` so the build can execute properly
- Staging will deploy docker image only: `npx cdk deploy CodePipelineStack-Staging`
  - Afterwards, you will need to deploy server separately: `npx cdk deploy DeploymentStack-Staging`
- Production **_includes server deployment_**: `CodePipelineStack-Production`
  - There is a **manual approval step** that requires the IAM user to approve the deployment on the AWS console UI on CodePipeline
- This will deploy `ECRStack` if it is not deployed
- Use CodePipeline on AWS Console UI to monitor progress

---

**_To access server:_**

- Go to ECS -> Clusters
- Click into the associated Cluster (you should be able to infer by the name)
- Scroll down and click on the service. There should only be 1
- Under the "Configuration and Networking" tab, find the DNS name for the ECS. You can click on the "Open address" link to open a new tab
- Alternatively, use Postman, Bruno or equivalent to make API calls using the DNS name

**_To access Bastion/RDS:_**

- Ensure you are in the root directory in the terminal
- Run `bastion.sh <bastion-host-name> <aws-region>` (e.g. `bastion.sh bastion-host us-east-1`)
  - You will need to include `--profile` flag if your AWS profile has a profile name associated with it
- Install DB Engine (e.g. psql) in Bastion Instance if desired:
  ```bash
  sudo yum update
  sudo yum search "postgres"
  sudo yum install postgresql<version>
  ```
- If you have PostgreSQL, access the DB via the bastion shell using information from the AWS Secrets manager
  ```bash
  psql -h <host-name> -U <username> -W <password>
  ```

### Teardown

**If you are deploying for testing/learning purposes, it is imperative to teardown all stacks to avoid incurring charges.**

To do so:

- Go into AWS Console UI -> ECR
- Delete relevant ECR repository
  - `npx cdk destroy` cannot delete the ECR stack when the repository contains images
- Run `npx cdk destroy --all`
