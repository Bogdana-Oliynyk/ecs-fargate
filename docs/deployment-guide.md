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
  - A sample server is available [here](https://github.com/nattiechan/sample-server) if desired. You will need to fork the repository to your GitHub account as well.
  - If the token to access server repository is different from the token above:
    - Store the additional token in the AWS Secrets Manager
    - You may need to modify the code in `CodePipelineStack` accordingly to account for a different secret name

### Local set up

- Run `npm install`
- Ensure you are authenticated with AWS - either via `aws configure` or `aws configure sso` (if SSO is enabled)
  - See [configure-aws-cli.md](./configure-aws-cli.md) for more details
- In [utils.ts](../lib/utils.ts), change the server and CDK GitHub repository addresses to the repositories that you are using

### Deployment

[aws-cdk.ts](../bin/aws-cdk.ts) contains all the stacks available for deployment. **_Staging is best for experimenting ECS/Fargate optimization without excessive CodeBuild resource usage._**

The syntax to deploy is `npx cdk deploy <stack-id>` (include `--profile` flag if your account has a profile name associated with it).

You can see the list of stacks using `cdk list`.

#### _Step 1: Ensure the following is set up_

- GitHub access token(s) stored in the AWS Secrets Manager, with the name `gh-token`
- Server repository path is changed in [utils.ts](../lib/utils.ts)
- AWS CDK repository path is changed in [utils.ts](../lib/utils.ts)
- The branch for the AWS CDK repository path is correct in the [code-pipeline-stack.ts](../lib/code-pipeline-stack.ts) (where the variable `pipeline` is defined)

#### _Step 2: Deploy "shared services"_

Shared services typically refers to the resources that are shared across multiple stacks. This includes the ECR, VPC in this repository.

```bash
# Deploy ECR and VPC
$ npx cdk deploy ECRStack VPCStack
```

#### _Step 3: Deploy RDS_

You will need to deploy RDS separately since RDS depends on an established VPC on AWS. Moreover, as much as the database and the server are interconnected, RDS should be deployed separately from the server itself.

Deploying RDS Stack will also deploy `BastionStack`.

```bash
# RDS Staging
$ npx cdk deploy RDSStack-Staging
# OR RDS Prod
$ npx cdk deploy RDSStack-Prod
```

#### _Step 4: Deploy Docker image +/- server_

Check the location of the Dockerfile in your server repository. You may need to update filepath in the `docker build ...` command in `utils.ts::dockerBuildCommands` so the build can execute properly.

Staging will deploy docker image only: `npx cdk deploy CodePipelineStack-Staging`. Afterwards, you will need to deploy server separately: `npx cdk deploy DeploymentStack-Staging`.

Production **_includes server deployment_**: `CodePipelineStack-Production`. There is a **manual approval step** that requires the IAM user to approve the deployment on the AWS console UI on CodePipeline.

Use CodePipeline on AWS Console UI to monitor progress.

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
- Delete any entries from AWS Systems Mananger (SSM) and/or Secrets Manager
