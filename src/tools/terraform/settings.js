{
  "apt": [
    "curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -",
    "sudo apt-add-repository \"deb [arch=$(dpkg --print-architecture)] https://apt.releases.hashicorp.com $(lsb_release -cs) main\"",
    "sudo apt update && sudo apt install terraform"
  ],
  "dnf": [
    "sudo dnf install -y dnf-plugins-core && sudo dnf config-manager --add-repo https://rpm.releases.hashicorp.com/$release/hashicorp.repo",
    "sudo dnf install terraform"
  ],
  "yum": [
    "sudo yum install -y yum-utils && sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/$release/hashicorp.repo",
    "sudo yum install terraform"
  ],
}
