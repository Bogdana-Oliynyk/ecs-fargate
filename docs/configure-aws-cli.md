## AWS CLI configuration

One note before we dive into considerations for the AWS CLI configuration:

_If you anticipate needing to access multiple AWS accounts in the same local machine, **Having a profile name associated with each credential** is highly recommended. This way you can easily do one of the following in the terminal after configuration to ensure you are always using the correct credentials:_

- In `~/.bash_profile.sh` or `~/.zshrc` (or equivalent), add the following to permanently point your default profile to a certain profile:

  ```bash
  export AWS_PROFILE=<profile-name>
  ```

- In your terminal, run `export AWS_PROFILE=<profile-name>` so your terminal instance would use the correct profile
- add `--profile <profile-name>` to the end of your command (e.g. `aws configure --profile foobar`)

---

There are many ways to provide authentication to AWS CLI - see the docs [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-authentication.html).

If your AWS Identity and Access Management (IAM) account has SSO authorization, then you can configure using `aws configure sso` as outlined in the docs [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html).

- Providing a profile name would be part of the prompt during the SSO configuration. We would strongly encourage you put a custom profile name instead of the default provided name. In the future you can easily refer to the profile name to retrieve all necessary information for SSO login via AWS CLI.

If you only need access for testing and/or demonstration purposes, then a IAM user long-term credential would work just fine ([docs](https://docs.aws.amazon.com/cli/latest/userguide/cli-authentication-user.html)). Use `aws configure` once the user is created. If you choose go to this route, a few important notes:

- You should have a profile name associated with the long-term credential (`aws configure --profile <profile-name>`) to keep things clean. See above on how to make the profile the default profile for your local environment during testing
- Once you finish deploying and tear down all stacks/resources, deactivate and/or delete the access key to prevent malicious usage
