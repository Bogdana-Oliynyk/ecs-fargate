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

## How to use this repository

See [how-to-use-this-repo.md](./docs/how-to-use-this-repo.md)

## Deployment guide

See [deployment-guide.md](./docs/deployment-guide.md)

## Future improvements

- Include more details instructions on deployment and how to check your work afterwards
- Include tests for CodePipelineStack
- Include more detailed instructions on how to generate IAM users with SSO access
- Generate certificate (and manage Route 53, if desired) via CDK, so the server can handle HTTPS traffic by default
- Generate and attach EC2 Key pairs to the bastion instance, so we can set up an SSH tunnel to RDS via Bastion _([This repo](https://github.com/aws-samples/secure-bastion-cdk) provides a great example on how to implement on top of the current infrastructure.)_
- Include a stack that automatically publish docker images and deploys server with a single stack
- Ensure all logs have a retention policy (so they are not retained forever)
