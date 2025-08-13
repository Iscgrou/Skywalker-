// R11: Cluster Coordinator - Heartbeat & Leader Election
import { getPool } from '../db';
import crypto from 'crypto';

interface ClusterNodeRow { node_id:string; started_at:Date; last_heartbeat:Date; version:string|null; role:string|null; is_leader:boolean; }
interface ClusterStatus { nodeId:string; isLeader:boolean; leaderNodeId?:string; nodes:Array<{ nodeId:string; ageSec:number; lastHeartbeatSec:number; isLeader:boolean }>; lastElection: number; }

type LeaderHook = ()=> void;

class ClusterCoordinator {
  private nodeId = `${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  private leader = false;
  private heartbeatTimer?: any;
  private electionTimer?: any;
  private lastElection = 0;
  private leaderAcquireHooks: LeaderHook[] = [];
  private leaderLoseHooks: LeaderHook[] = [];

  start(){
    const pool = getPool();
    if(!pool){ console.warn('[Cluster] No DB pool; running in single-node mode'); return; }
    this.heartbeatTimer = setInterval(()=> this.heartbeat().catch(()=>{}), 5000);
    this.electionTimer = setInterval(()=> this.elect().catch(()=>{}), 7000);
    this.heartbeat();
    this.elect();
  }

  onLeaderAcquire(h:LeaderHook){ this.leaderAcquireHooks.push(h); }
  onLeaderLose(h:LeaderHook){ this.leaderLoseHooks.push(h); }

  isLeader(){ return this.leader; }
  getNodeId(){ return this.nodeId; }

  async heartbeat(){
    const pool = getPool(); if(!pool) return;
    await pool.query(`INSERT INTO cluster_nodes(node_id, started_at, last_heartbeat, version, role, is_leader)
      VALUES($1, now(), now(), $2, $3, $4)
      ON CONFLICT (node_id) DO UPDATE SET last_heartbeat = EXCLUDED.last_heartbeat, is_leader = EXCLUDED.is_leader`,
      [this.nodeId, process.env.APP_VERSION||'dev', 'worker', this.leader]);
  }

  private async elect(){
    const pool = getPool(); if(!pool) return;
    // Use advisory lock for leader election
    const lockKeyHigh = 42; const lockKeyLow = 7; // arbitrary
    const res = await pool.query('SELECT pg_try_advisory_lock($1,$2) as got', [lockKeyHigh, lockKeyLow]);
    const got = res.rows[0]?.got; // boolean
    if (got){
      if (!this.leader){
        this.leader = true;
        this.lastElection = Date.now();
        await pool.query('UPDATE cluster_nodes SET is_leader = (node_id=$1)', [this.nodeId]);
        this.leaderAcquireHooks.forEach(h=> { try { h(); } catch{} });
        console.log('[Cluster] Became leader');
      }
    } else {
      if (this.leader){
        this.leader = false;
        await pool.query('UPDATE cluster_nodes SET is_leader = false WHERE node_id=$1', [this.nodeId]);
        this.leaderLoseHooks.forEach(h=> { try { h(); } catch{} });
        console.log('[Cluster] Lost leadership');
      }
    }
  }

  async getStatus(): Promise<ClusterStatus> {
    const pool = getPool();
    if(!pool){
      return { nodeId: this.nodeId, isLeader: true, leaderNodeId: this.nodeId, nodes:[{ nodeId:this.nodeId, ageSec:0, lastHeartbeatSec:0, isLeader:true }], lastElection: this.lastElection };
    }
    const rs = await pool.query('SELECT * FROM cluster_nodes');
    const nodes: ClusterNodeRow[] = rs.rows;
    const now = Date.now();
    const mapped = nodes.map(n=> ({ nodeId:n.node_id, isLeader:n.is_leader, ageSec: (now - new Date(n.started_at).getTime())/1000, lastHeartbeatSec:(now - new Date(n.last_heartbeat).getTime())/1000 }));
    const leaderNodeId = mapped.find(n=> n.isLeader)?.nodeId;
    return { nodeId: this.nodeId, isLeader: this.leader, leaderNodeId, nodes: mapped, lastElection: this.lastElection };
  }
}

export const clusterCoordinator = new ClusterCoordinator();
