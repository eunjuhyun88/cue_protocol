// ============================================================================
// 📁 backend/src/types/database.types.ts - Supabase 데이터베이스 타입 정의
// 🎯 목적: DatabaseService import 에러 해결
// ============================================================================

// Re-export from main types file for backward compatibility
export * from './index';

// Additional database-specific types
export interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
  anonKey?: string;
  schema?: string;
}

export interface DatabaseServiceInterface {
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  testConnection(): Promise<boolean>;
  healthCheck(): Promise<boolean>;
  getConnectionInfo(): any;
  getHealth(): Promise<any>;
  runDiagnostics(): Promise<void>;
  
  // User management
  createUser(userData: any): Promise<any>;
  getUserById(userId: string): Promise<any | null>;
  getUserByEmail(email: string): Promise<any | null>;
  getUserByDID(did: string): Promise<any | null>;
  getUserByUsername(username: string): Promise<any | null>;
  updateUser(id: string, updates: any): Promise<any>;
  getUserCount(): Promise<number>;
  
  // WebAuthn management
  saveWebAuthnCredential(credentialData: any): Promise<boolean>;
  getUserByCredentialId(credentialId: string): Promise<any | null>;
  getWebAuthnCredentials(userId: string): Promise<any[]>;
  getWebAuthnCredentialById(credentialId: string): Promise<any | null>;
  updateWebAuthnCredentialCounter(credentialId: string, counter: number): Promise<boolean>;
  updateCredentialLastUsed(credentialId: string): Promise<boolean>;
  
  // Session management
  createWebAuthnSession(sessionData: any): Promise<any>;
  getActiveWebAuthnSessions(userId: string): Promise<any[]>;
  getWebAuthnSession(sessionId: string): Promise<any>;
  deleteWebAuthnSession(sessionId: string): Promise<boolean>;
  createWebAuthnChallenge(challengeData: any): Promise<any>;
  getWebAuthnChallenge(challenge: string): Promise<any | null>;
  markChallengeAsUsed(challengeId: string): Promise<boolean>;
  
  // CUE token management
  getCUEBalance(userDid: string): Promise<number>;
  createCUETransaction(transaction: any): Promise<any>;
  getCUETransactions(userDid: string, limit?: number): Promise<any[]>;
  updateUserCueBalanceByDid(userDid: string, newBalance: number): Promise<boolean>;
  
  // AI Passport management
  getPassport(did: string): Promise<any | null>;
  updatePassport(did: string, updates: any): Promise<any>;
  createPassport(passportData: any): Promise<any>;
  
  // Data Vault management
  getDataVaults(userDid: string): Promise<any[]>;
  getUserVaults(userId: string): Promise<any[]>;
  getVaultById(vaultId: string): Promise<any | null>;
  createVault(vaultData: any): Promise<any>;
  updateVault(vaultId: string, updates: any): Promise<any>;
  deleteVault(vaultId: string): Promise<boolean>;
  saveVaultData(vaultData: any): Promise<any>;
  getVaultData(vaultId: string, limit?: number): Promise<any[]>;
  
  // Personal CUE management
  getPersonalCues(userDid: string, limit?: number): Promise<any[]>;
  storePersonalCue(cueData: any): Promise<any>;
  getPersonalCue(userDid: string, cueKey: string, cueType: string): Promise<any | null>;
  searchPersonalCues(userDid: string, query: string, limit?: number): Promise<any[]>;
  
  // Chat management
  createConversation(conversationData: any): Promise<any>;
  saveMessage(messageData: any): Promise<any>;
  getChatHistory(userDid: string, conversationId?: string, limit?: number): Promise<any[]>;
  
  // AI Agents
  getAIAgents(): Promise<any[]>;
  getAIAgent(agentId: string): Promise<any | null>;
  
  // Platform connections
  getConnectedPlatforms(userId: string): Promise<any[]>;
  updatePlatformConnection(userId: string, platformId: string, updates: any): Promise<any>;
  
  // System activities
  logSystemActivity(activityData: any): Promise<void>;
  getSystemActivities(userId?: string, limit?: number): Promise<any[]>;
  
  // Utility methods
  cleanupExpiredSessions(): Promise<boolean>;
  getSystemStats(): Promise<any>;
  getStatistics(): any;
  close(): Promise<void>;
  dispose(): void;
  
  // Compatibility aliases
  findUserById(userId: string): Promise<any | null>;
  findUserByEmail(email: string): Promise<any | null>;
  getUserByDid(did: string): Promise<any | null>;
  recordCueTransaction(transactionData: any): Promise<any>;
  updateUserCueBalance(userId: string, newBalance: number): Promise<any>;
  getPersonalCuesByUser(userDid: string): Promise<any[]>;
  createPersonalCue(cueData: any): Promise<any>;
  addPersonalCue(cueData: any): Promise<any>;
  savePersonalCue(cueData: any): Promise<any>;
  saveChatMessage(messageData: any): Promise<void>;
  getConversationHistory(userId: string, conversationId?: string, limit?: number): Promise<any[]>;
}

// Table row types
export interface UserRow {
  id: string;
  username: string;
  email: string;
  did: string;
  profile_data?: any;
  cue_tokens?: number;
  trust_score?: number;
  personality_profile?: any;
  preferences?: any;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface WebAuthnCredentialRow {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_name?: string;
  backup_eligible?: boolean;
  backup_state?: boolean;
  transports?: string[];
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
}

export interface WebAuthnSessionRow {
  id: string;
  user_id: string;
  session_token: string;
  credential_id?: string;
  device_info?: any;
  ip_address?: string;
  user_agent?: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  last_activity_at?: string;
  ended_at?: string;
}

export interface WebAuthnChallengeRow {
  id: string;
  challenge: string;
  user_id?: string;
  session_id?: string;
  challenge_type: string;
  origin?: string;
  user_agent?: string;
  ip_address?: string;
  device_fingerprint?: string;
  platform?: string;
  expires_at: string;
  is_used: boolean;
  used_at?: string;
  created_at: string;
}

export interface ConversationRow {
  id: string;
  user_id: string;
  title?: string;
  ai_agent_id?: string;
  context?: any;
  metadata?: any;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  model?: string;
  tokens_used?: number;
  processing_time?: number;
  metadata?: any;
  timestamp: string;
  created_at: string;
}

export interface PersonalCueRow {
  id: string;
  user_did: string;
  user_id?: string;
  cue_key: string;
  cue_type: string;
  cue_value: any;
  confidence_score?: number;
  source_context?: string;
  extracted_at?: string;
  category?: string;
  tags?: string[];
  status: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface CueTransactionRow {
  id: string;
  user_did: string;
  user_id?: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  source_platform?: string;
  description?: string;
  status: string;
  metadata?: any;
  created_at: string;
}

export interface AIPassportRow {
  id: string;
  did: string;
  display_name?: string;
  personality_summary?: any;
  trust_metrics?: any;
  achievements?: any[];
  data_vault_stats?: any;
  interaction_history?: any;
  preferences?: any;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DataVaultRow {
  id: string;
  user_id: string;
  owner_did: string;
  name: string;
  description?: string;
  vault_type: string;
  encryption_key?: string;
  access_permissions?: any;
  data_count: number;
  total_size: number;
  status: string;
  created_at: string;
  updated_at: string;
  last_accessed_at?: string;
}

export interface VaultDataRow {
  id: string;
  vault_id: string;
  data_type: string;
  content: any;
  content_hash?: string;
  encryption_status?: string;
  tags?: string[];
  metadata?: any;
  created_at: string;
}

export interface ConnectedPlatformRow {
  id: string;
  user_id: string;
  platform_id: string;
  platform_name: string;
  connection_status: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  permissions?: string[];
  sync_settings?: any;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AIAgentRow {
  id: string;
  agent_id: string;
  name: string;
  description?: string;
  model_config?: any;
  personality?: any;
  capabilities?: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SystemActivityRow {
  id: string;
  user_id?: string;
  activity_type: string;
  description: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  status: string;
  created_at: string;
}

// Complete database schema
export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: Omit<UserRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserRow, 'id' | 'created_at'>>;
      };
      webauthn_credentials: {
        Row: WebAuthnCredentialRow;
        Insert: Omit<WebAuthnCredentialRow, 'id' | 'created_at'>;
        Update: Partial<WebAuthnCredentialRow>;
      };
      webauthn_sessions: {
        Row: WebAuthnSessionRow;
        Insert: Omit<WebAuthnSessionRow, 'id' | 'created_at'>;
        Update: Partial<WebAuthnSessionRow>;
      };
      webauthn_challenges: {
        Row: WebAuthnChallengeRow;
        Insert: Omit<WebAuthnChallengeRow, 'id' | 'created_at'>;
        Update: Partial<WebAuthnChallengeRow>;
      };
      conversations: {
        Row: ConversationRow;
        Insert: Omit<ConversationRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<ConversationRow>;
      };
      messages: {
        Row: MessageRow;
        Insert: Omit<MessageRow, 'id' | 'created_at'>;
        Update: Partial<MessageRow>;
      };
      personal_cues: {
        Row: PersonalCueRow;
        Insert: Omit<PersonalCueRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<PersonalCueRow>;
      };
      cue_transactions: {
        Row: CueTransactionRow;
        Insert: Omit<CueTransactionRow, 'id' | 'created_at'>;
        Update: Partial<CueTransactionRow>;
      };
      ai_passports: {
        Row: AIPassportRow;
        Insert: Omit<AIPassportRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<AIPassportRow>;
      };
      data_vaults: {
        Row: DataVaultRow;
        Insert: Omit<DataVaultRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<DataVaultRow>;
      };
      vault_data: {
        Row: VaultDataRow;
        Insert: Omit<VaultDataRow, 'id' | 'created_at'>;
        Update: Partial<VaultDataRow>;
      };
      connected_platforms: {
        Row: ConnectedPlatformRow;
        Insert: Omit<ConnectedPlatformRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<ConnectedPlatformRow>;
      };
      ai_agents: {
        Row: AIAgentRow;
        Insert: Omit<AIAgentRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<AIAgentRow>;
      };
      system_activities: {
        Row: SystemActivityRow;
        Insert: Omit<SystemActivityRow, 'id' | 'created_at'>;
        Update: Partial<SystemActivityRow>;
      };
    };
  };
}