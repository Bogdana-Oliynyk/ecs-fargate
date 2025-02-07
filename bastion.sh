#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

usage()
{
cat << EOF
usage: $0 BASTION_NAME AWS_REGION [-p|--profile] [-h|--help]

This script provides access to Bastion instance via
AWS Session Manager (SSM).

Before script execution, please ensure you have authentication
configured for AWS, whether it is via "aws configure" or
"aws configure sso"

OPTIONS:
    BASTION_NAME            Bastion name defined in BastionStack
    AWS_REGION              The AWS region where your resources are hosted
    -p|--profile            The AWS profile used to access resources, if applicable
                            This is equivalent to usage: "aws s3 ls --profile <profile>"
    -h|--help               Shows this message
EOF
}

if [[ $1 == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

if [[ $# -lt 2 || "$1" == -* || "S2" == -* ]]; then
    echo "Error: Missing required arguments: BASTION_NAME and AWS_REGION"
    echo "use -h or --help flag for more information"
    exit 1;
fi

BASTION_NAME=$1; shift
AWS_REGION=$1; shift
AWS_PROFILE=""

while [ $# -gt 0 ]; do
    case "$1" in
        -p | --profile)
            AWS_PROFILE="$2"
            shift
            ;;
        -h | --help)
            usage
            exit
            ;;
        *)
            echo "Unknown parameter passed: $1"
            exit 1
        ;;
    esac
    shift
done

echo "Retrieving bastion instance ID..."
BASTION_INSTANCE_ID=$(aws ec2 describe-instances \
    --region=$AWS_REGION \
    --filter "Name=tag:Name,Values=$BASTION_NAME" \
    --query "Reservations[].Instances[?State.Name == 'running'].InstanceId[]" \
    --output text
)

echo $BASTION_INSTANCE_ID

echo "Starting session..."
aws ssm start-session --target $BASTION_INSTANCE_ID --region=$AWS_REGION

# Install DB Engine (e.g. psql) in Bastion Instance if desired:
# $ sudo yum update
# $ sudo yum search "postgres"
# $ sudo yum install postgresql<version>