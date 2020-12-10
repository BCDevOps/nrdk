void listPendingBuildInput(String bitBucketProjectName, String bitBucketRepoName, String pullRequestNumber) {
  def multiBranchProject = jenkins.model.Jenkins.instance.getAllItems(org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject.class).find({
    def scmSource=it.getSCMSources()[0]
    return bitBucketProjectName.equalsIgnoreCase(scmSource.getRepoOwner()) && bitBucketRepoName.equalsIgnoreCase(scmSource.getRepository())
  })
  
  def pullRequestBranch = multiBranchProject.getItem('PR-' + pullRequestNumber)
  def build = pullRequestBranch.getLastBuild()
  hudson.security.ACL.impersonate(hudson.security.ACL.SYSTEM, {
    for (org.jenkinsci.plugins.workflow.support.steps.input.InputAction inputAction : build.getActions(org.jenkinsci.plugins.workflow.support.steps.input.InputAction.class)){
      for (org.jenkinsci.plugins.workflow.support.steps.input.InputStepExecution inputStep:inputAction.getExecutions()){
        println inputStep.getId()
      }
    }
  } as Runnable)
}
// listPendingBuildInput('IRS', 'irs-war', '15')

void approveBuildInput(String bitBucketProjectName, String bitBucketRepoName, String pullRequestNumber, String inputId) {
  def multiBranchProject = jenkins.model.Jenkins.instance.getAllItems(org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject.class).find({
    def scmSource=it.getSCMSources()[0]
    return bitBucketProjectName.equalsIgnoreCase(scmSource.getRepoOwner()) && bitBucketRepoName.equalsIgnoreCase(scmSource.getRepository())
  })
  
  def pullRequestBranch = multiBranchProject.getItem('PR-' + pullRequestNumber)
  def build = pullRequestBranch.getLastBuild()
  hudson.security.ACL.impersonate(hudson.security.ACL.SYSTEM, {
    for (org.jenkinsci.plugins.workflow.support.steps.input.InputAction inputAction : build.getActions(org.jenkinsci.plugins.workflow.support.steps.input.InputAction.class)){
      for (org.jenkinsci.plugins.workflow.support.steps.input.InputStepExecution inputStep:inputAction.getExecutions()){
        if(inputStep.getId().equalsIgnoreCase(inputId) && !inputStep.isSettled()){
          inputStep.proceed(null)
        }
      }
    }
  } as Runnable)
}
// approveBuildInput('IRS', 'irs-war', '15', 'Jira-DLVR')
