#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {
  BastionStack,
  DeploymentStack,
  CodePipelineStack,
  ECRStack,
  RDSStack,
  VPCStack,
} from '../lib/';

const app = new cdk.App();
const ENV = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};
const STAGING = 'staging';
const PRODUCTION = 'production';

// ------ SHARED SERVICES -------

// ECR repo
const ecrStack = new ECRStack(app, 'ECRStack', { env: ENV });

// VPC
new VPCStack(app, 'VPCStack', { env: ENV });

// Bastion for DB access
const bastionStack = new BastionStack(app, 'BastionStack', { env: ENV });

// ----- END SHARED SERVICES -----

// ---------- STAGING ------------

// RDS DB
new RDSStack(app, 'RDSStack-Staging', {
  stageName: STAGING,
  bastionSecurityGroup: bastionStack.securityGroup,
  env: ENV,
});

// Here we demonstrate docker image and server deployment
// done in separate stacks. One use-case would be if we
// are working on network and/or optimizing ECS/Fargate
// without the need to publish docker image every time
// This way we reduce unnecessary CodeBuild/CodePipeline usage
new CodePipelineStack(app, 'CodePipelineStack-Staging', {
  stageName: STAGING,
  imageTag: STAGING,
  ecr: ecrStack.ecr,
  deployServer: false,
  env: ENV,
});
// Server deployment
new DeploymentStack(app, 'DeploymentStack-Staging', {
  stageName: STAGING,
  imageTag: STAGING,
  env: ENV,
});

// --------- END STAGING ------------

// ---------- PRODUCTION ------------

// RDS DB
new RDSStack(app, 'RDSStack-Prod', {
  stageName: PRODUCTION,
  bastionSecurityGroup: bastionStack.securityGroup,
  env: ENV,
});

// Publish Docker image + server deployment
new CodePipelineStack(app, 'CodePipelineStack-Prod', {
  stageName: PRODUCTION,
  imageTag: PRODUCTION,
  ecr: ecrStack.ecr,
  deployServer: true,
  env: ENV,
});

// --------- END PRODUCTION -----------
