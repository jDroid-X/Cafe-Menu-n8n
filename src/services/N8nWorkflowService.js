// ==========================================================
// N8nWorkflowService – loads and persists the n8n workflow JSON
// ==========================================================

const fs = require('node:fs');
const path = require('node:path');
// Use native globalThis.fetch available in Node 18+ without external dependencies
const fetch = globalThis.fetch || ((...args) => import('node-fetch').then(({ default: f }) => f(...args)));

class N8nWorkflowService {
  constructor() {
    if (N8nWorkflowService.instance) return N8nWorkflowService.instance;
    this.workflowPath = path.resolve(__dirname, '../../n8n-workflow.json');
    this._workflow = this._load();
    N8nWorkflowService.instance = this;
  }

  static getInstance() {
    if (!N8nWorkflowService.instance) {
      N8nWorkflowService.instance = new N8nWorkflowService();
    }
    return N8nWorkflowService.instance;
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.workflowPath, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.warn('[N8nWorkflowService] Failed to load workflow JSON:', err.message);
      return {};
    }
  }

  getWorkflow() {
    // Return a deep copy to avoid accidental mutation
    return JSON.parse(JSON.stringify(this._workflow));
  }

  setWorkflow(json) {
    if (typeof json !== 'object' || json === null) {
      throw new Error('Workflow must be a non‑null object');
    }
    this._workflow = json;
    this._save();
  }

  _save() {
    const data = JSON.stringify(this._workflow, null, 2);
    fs.writeFileSync(this.workflowPath, data, 'utf8');
  }

  /** Optional: push the current workflow JSON to the GitHub repo */
  async pushToGitHub() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error('GITHUB_TOKEN not set');
    const repo = 'jDroid-X/Cafe-Menu-n8n';
    const branch = 'main';
    const pathInRepo = 'n8n-workflow.json';
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${pathInRepo}`;
    const contentBase64 = Buffer.from(JSON.stringify(this._workflow, null, 2)).toString('base64');

    // First get the SHA of the existing file
    const getResp = await fetch(`${apiUrl}?ref=${branch}`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
    });
    const getData = await getResp.json();
    const sha = getData.sha;

    const putResp = await fetch(apiUrl, {
      method: 'PUT',
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
      body: JSON.stringify({
        message: 'Update n8n workflow via admin UI',
        content: contentBase64,
        sha,
        branch
      })
    });
    if (!putResp.ok) {
      const err = await putResp.text();
      throw new Error(`GitHub push failed: ${err}`);
    }
    return await putResp.json();
  }
}

module.exports = N8nWorkflowService;
