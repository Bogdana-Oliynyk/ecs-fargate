## Introduction

This project demonstrates how to deploy a backend server with SQL database to Amazon Web Services (AWS), using AWS Cloud Development Kit (CDK).

Many thanks to [Jiecheng Dong](https://github.com/jiedong111) and [Alexander Infante](https://github.com/Alexander-Infante) for their support and mentorship, and [Sabrina Goldfarb](https://github.com/sgoldfarb2) for making this project possible.

## High-level Architecture

Shared resources:

- Virtual Private Cloud (VPC) that connects all available Services
- Elastic Container Registry (ECR) that stores the docker image for the server

For staging and/or production environments:

- Application load balancer created by AWS Fargate to manage client traffic
- Server deployed using AWS Fargate in a _public subnet_
- Relational Database Service (RDS) in a _private subnet_

Other utility resources:

- Bastion EC2 instance to securely access the RDS in a private subnet

## Pre-requisite

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
- A GitHub token (generated from your developer settings) for AWS to access this repository
  - Store this token in the AWS Secrets Manager, with the name `gh-token`
- A server repository which you have a GitHub token for AWS to access the repository. It can be a public or private repository
  - Store this token in the AWS Secrets Manager
  - If the token to access server repository is different from the token above, you may need to modify the code in `DockerImageStack` accordingly

## Deployment guide

### Local set up

- Run `npm install`
- Ensure you are authenticated with AWS - either via `aws configure` or `aws configure sso` (if SSO is enabled)
  - If you anticipate having multiple profiles associated with your local machine, **_having profiles attached to each account is strongly recommended so you can switch between profiles with ease_**
  - You can do so by: `aws configure --profile <profile-name>` or through the prompt in `aws configure sso`
- In [utils.ts](./lib/utils.ts), change the server and CDK GitHub repository addresses to the repositories that you are using

### Deployment

[aws-cdk.ts](./bin/aws-cdk.ts) contains all the stacks available for deployment. **Staging is best used for testing and/or demonstration purposes.**

There is no strict rules in terms of the stack order for deployment. The stacks are set up in a way that you can deploy most stacks independently, or the stack will also deploy other resources that the stack is dependent upon.

The syntax to deploy is `npx cdk deploy <stack-id>` (include `--profile` flag if your account has a profile name associated with it).

You can see the list of stacks using `cdk list`.

Below is an example flow of how the stacks can be deployed. You can use CloudFormation or console to monitor progress unless otherwise specified:

1. Deploy VPC and ECR: `npx cdk deploy ECRStack VPCStack`
   - These are "shared services" for other stacks
2. Deploy RDS: `npx cdk deploy RDSStack-Staging` (or `RDSStack-Production` for production ENV)
   - Since `RDSStack` depends on `BastionStack`, the `BastionStack` should deploy along with `RDSStack` if not done so
3. Deploy Docker image: `npx cdk deploy DockerImageStack-Staging` (or `DockerImageStack-Production` for production ENV)
   - Use CodePipeline on AWS Console UI to monitor progress
4. Deploy Server/Fargate: `npx cdk deploy DeploymentStack-Staging` (or `DeploymentStack-Production` for production ENV)

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

## Future improvements

- Manage Route 53 and certificate via CDK, so the server can handle HTTPS traffic by default
- Generate and attach EC2 Key pairs to the bastion instance, so we can set up an SSH tunnel to RDS via Bastion _([This repo](https://github.com/aws-samples/secure-bastion-cdk) provides a great example on how to implement on top of the current infrastructure.)_
- Include a stack that automatically publish docker images and deploys server with a single stack
- Ensure all logs have a retention policy (so they are not retained forever)
