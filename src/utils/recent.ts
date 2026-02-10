import { projectRepository, RecentProjectRecord } from '../services/projectRepository';

export type RecentProject = RecentProjectRecord;

export async function addRecent(project: RecentProject): Promise<void> {
  await projectRepository.recordRecent(project);
}

export async function listRecents(limit = 5): Promise<RecentProject[]> {
  return projectRepository.listRecentProjects(limit);
}
