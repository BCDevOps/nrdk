import {BranchReference, RepositoryReference} from '../service/axios-bitbucket-client'

export interface GitProvider {
    createBranchIfMissing(repository: RepositoryReference, branchName: string, startPoint: string): Promise<BranchReference> ;
}
