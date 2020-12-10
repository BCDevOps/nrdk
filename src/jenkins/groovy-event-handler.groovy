// com.cloudbees.hudson.plugins.folder.Folder
// com.cloudbees.hudson.plugins.folder.AbstractFolder
log.info("Fired event '${event}'!")
if (binding.hasVariable('run')) {
  log.info(" > ${event} --- Job(run) -> ${run.getDisplayName()}")
}
if (binding.hasVariable('item')) {
  log.info("> ${event} --- Item -> ${item} class:'${item.class}'")
  if (item instanceof hudson.model.Queue.WaitingItem) {
     log.info("> ${event} --- Item.task -> ${item.task.class}")
      if (item.task instanceof org.jenkinsci.plugins.workflow.support.steps.ExecutorStepExecution.PlaceholderTask ) {
        log.info("> ${event} --- Item.task.context -> ${item.task.context}")
        def _run = item.task.context.get(hudson.model.Run)
        def _job = _run.getParent() // org.jenkinsci.plugins.workflow.job.WorkflowJob
        def _project = _job.getParent() // org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject
        // find parent which is hudson.model.ItemGroup
        log.info("> ${event} --- Item...Run -> ${_run.getClass()}")
        log.info("> ${event} --- Item...Job -> ${_job}")
        log.info("> ${event} --- Item...Project -> ${_project}")
        log.info("> ${event} --- Item.task.label -> ${item.task.label}")
        def projectName = _project.getName()
        if (item.task.label != null && item.task.label.trim().length()>0) {
          item.task.label = "${projectName}&&(${item.task.label.trim()})"
        } else {
          item.task.label = "${projectName}"
        }
      }
  }
}
