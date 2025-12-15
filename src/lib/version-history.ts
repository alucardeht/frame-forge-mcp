import { promises as fs } from 'fs';
import path from 'path';
import { ComponentVersion, VersionHistory, WireframeComponent } from '../types/index.js';

export class ComponentVersionManager {
  private storageDir: string;

  constructor(storageDir: string) {
    this.storageDir = storageDir;
  }

  private getVersionPath(sessionId: string, wireframeId: string, componentId: string): string {
    return path.join(
      this.storageDir,
      sessionId,
      'versions',
      wireframeId,
      `${componentId}.json`
    );
  }

  async recordVersion(
    sessionId: string,
    wireframeId: string,
    component: WireframeComponent,
    changeType: ComponentVersion['changeType'],
    changeDescription: string,
    previousVersionId?: string
  ): Promise<ComponentVersion> {
    const versionId = `v-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const version: ComponentVersion = {
      versionId,
      componentId: component.id,
      wireframeId,
      timestamp: new Date().toISOString(),
      changeType,
      changeDescription,
      componentState: { ...component },
      previousVersionId,
    };

    const versionPath = this.getVersionPath(sessionId, wireframeId, component.id);
    await fs.mkdir(path.dirname(versionPath), { recursive: true });

    let history: VersionHistory;
    try {
      const content = await fs.readFile(versionPath, 'utf-8');
      history = JSON.parse(content) as VersionHistory;
      history.versions.push(version);
      history.currentVersionId = versionId;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        history = {
          wireframeId,
          componentId: component.id,
          versions: [version],
          currentVersionId: versionId,
        };
      } else {
        throw error;
      }
    }

    await fs.writeFile(versionPath, JSON.stringify(history, null, 2), 'utf-8');

    return version;
  }

  async getHistory(
    sessionId: string,
    wireframeId: string,
    componentId: string
  ): Promise<VersionHistory | null> {
    const versionPath = this.getVersionPath(sessionId, wireframeId, componentId);

    try {
      const content = await fs.readFile(versionPath, 'utf-8');
      return JSON.parse(content) as VersionHistory;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async getVersion(
    sessionId: string,
    wireframeId: string,
    componentId: string,
    versionId: string
  ): Promise<ComponentVersion | null> {
    const history = await this.getHistory(sessionId, wireframeId, componentId);
    if (!history) return null;

    return history.versions.find(v => v.versionId === versionId) ?? null;
  }

  async restoreVersion(
    sessionId: string,
    wireframeId: string,
    componentId: string,
    versionId: string
  ): Promise<ComponentVersion | null> {
    const targetVersion = await this.getVersion(sessionId, wireframeId, componentId, versionId);
    if (!targetVersion) return null;

    const restoredVersion = await this.recordVersion(
      sessionId,
      wireframeId,
      targetVersion.componentState,
      'restored',
      `Restored from version ${versionId}`,
      targetVersion.versionId
    );

    return restoredVersion;
  }

  async listVersions(
    sessionId: string,
    wireframeId: string,
    componentId: string
  ): Promise<Array<{ versionId: string; timestamp: string; changeType: string; changeDescription: string }>> {
    const history = await this.getHistory(sessionId, wireframeId, componentId);
    if (!history) return [];

    return history.versions.map(v => ({
      versionId: v.versionId,
      timestamp: v.timestamp,
      changeType: v.changeType,
      changeDescription: v.changeDescription,
    }));
  }
}

export function createVersionManager(storageDir: string): ComponentVersionManager {
  return new ComponentVersionManager(storageDir);
}
