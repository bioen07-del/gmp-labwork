import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pdpbhdtkdrswemdngflg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkcGJoZHRrZHJzd2VtZG5nZmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NTM1MzUsImV4cCI6MjA4MzAyOTUzNX0.bsbRY2c_4Q0p1VSUm9DeXOwT9kqicHVcuy2ibKFl0Wc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type CellType = {
  id: number;
  code: string;
  name_ru: string;
  archived: boolean;
};

export type ContainerType = {
  id: number;
  code: string;
  category: string;
  growth_area_cm2: number | null;
  working_volume_min_ml: number | null;
  working_volume_max_ml: number | null;
  notes: string | null;
  archived: boolean;
};

export type Location = {
  id: number;
  parent_id: number | null;
  location_code: string;
  name_ru: string;
  type: string;
  archived: boolean;
};

export type Equipment = {
  id: number;
  equipment_code: string;
  name_ru: string;
  equipment_type: string;
  status: string;
  valid_until: string | null;
  location_id: number | null;
  inventory_number: string | null;
  catalog_number: string | null;
  archived: boolean;
};

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  role_id: number | null;
  is_active: boolean;
};

export type Donor = {
  id: number;
  donor_code: string;
  full_name: string | null;
  birth_date: string | null;
  gender: string | null;
  blood_type: string | null;
  archived: boolean;
};

export type Donation = {
  id: number;
  donation_code: string;
  donor_id: number | null;
  donation_datetime: string;
  material_type: string;
  received_condition: string | null;
  transport_temperature_c: number | null;
  notes: string | null;
  archived: boolean;
  donor?: Donor;
};

export type Material = {
  id: number;
  material_code: string;
  donation_id: number | null;
  cell_type_id: number | null;
  status: string;
};

export type Container = {
  id: number;
  container_code: string;
  material_id: number | null;
  donation_id: number | null;
  container_type_id: number | null;
  passage_number: number | null;
  status: string;
  risk_flag: boolean;
  current_location_id: number | null;
  concentration_cells_ml: number | null;
  total_cells: number | null;
  viability_percent: number | null;
  volume_ml: number | null;
  archived: boolean;
  container_type?: ContainerType;
  location?: Location;
  donation?: Donation;
};

export type ContainerLink = {
  id: number;
  parent_container_id: number;
  child_container_id: number;
  link_type: string;
  created_step_id: number | null;
};

export type Task = {
  id: number;
  title: string;
  description: string | null;
  task_type: string;
  status: string;
  priority: string;
  due_date: string | null;
  container_id: number | null;
  workflow_instance_id: number | null;
  assigned_to: string | null;
  completed_at: string | null;
  created_at: string;
  // Operator mode fields
  scope_type: 'Run' | 'Container' | 'General';
  scope_id: number | null;
  is_group: boolean;
  container?: Container;
  assignee?: Profile;
  workflow_instance?: WorkflowInstance;
  targets?: TaskTarget[];
};

export type TaskTarget = {
  id: number;
  task_id: number;
  container_id: number;
  status: 'Pending' | 'Completed' | 'Skipped';
  completed_at: string | null;
  skipped_reason: string | null;
  notes: string | null;
  data_json: Record<string, unknown> | null;
  created_at: string;
  container?: Container;
};

export type Process = {
  id: number;
  code: string;
  name_ru: string;
  description: string | null;
};

export type ProcessVersion = {
  id: number;
  process_id: number;
  version: string;
  status: string;
  process?: Process;
};

export type StepTemplate = {
  id: number;
  code: string;
  name_ru: string;
  requires_lab_session: boolean;
};

export type ProcessStep = {
  id: number;
  process_version_id: number;
  step_template_id: number;
  step_order: number;
  is_repeatable: boolean;
  step_template?: StepTemplate;
};

export type ExecutedStep = {
  id: number;
  workflow_instance_id: number;
  process_step_id: number | null;
  step_template_id: number;
  form_schema_id: number | null;
  is_adhoc: boolean;
  status: string;
  performed_by: string | null;
  performed_at: string | null;
  data_json: Record<string, unknown> | null;
  step_template?: StepTemplate;
  performer?: Profile;
};

export type RunStage = 'Donation' | 'Primary' | 'MCB_Creation' | 'MCB_Stored' | 'WCB_Creation' | 'WCB_Stored' | 'Released' | 'Disposed' | 'Closed';

export type WorkflowInstance = {
  id: number;
  process_version_id: number;
  root_material_id: number | null;
  donation_id: number | null;
  status: string;
  instance_params_json: Record<string, unknown> | null;
  // Operator mode fields
  stage: RunStage;
  run_name: string | null;
  process_version?: ProcessVersion;
  donation?: Donation;
};

export type BankBatch = {
  id: number;
  bank_code: string;
  bank_type: 'MCB' | 'WCB';
  source_material_id: number | null;
  status: string;
  passage_at_freeze: number | null;
  vial_type_id: number | null;
  cells_per_vial: number | null;
  qty_created: number;
  qty_available: number;
  created_at: string;
  vial_type?: ContainerType;
};

export type QcTestDefinition = {
  id: number;
  code: string;
  name_ru: string;
  result_type: 'STATUS' | 'NUMERIC';
  numeric_min: number | null;
  required_for: string | null;
};

export type QcResult = {
  id: number;
  test_definition_id: number;
  entity_type: string;
  entity_id: number;
  status: string;
  numeric_value: number | null;
  attachment_id: number | null;
  created_at: string;
  test_definition?: QcTestDefinition;
};

export type Release = {
  id: number;
  release_code: string;
  release_type: 'FROZEN' | 'FRESH';
  customer_name: string | null;
  status: string;
  conc_cells_ml: number | null;
  volume_ml: number | null;
  total_cells: number | null;
  viability_percent: number | null;
  passage_at_release: number | null;
  released_by: string | null;
  released_at: string | null;
  created_at: string;
};

export type DeviationReason = {
  id: number;
  code: string;
  name_ru: string;
};

export type Deviation = {
  id: number;
  deviation_code: string;
  reason_id: number | null;
  description: string | null;
  status: 'Open' | 'UnderReview' | 'Closed';
  severity: 'Minor' | 'Major' | 'Critical';
  disposition: string | null;
  created_at: string;
  closed_at: string | null;
  closed_by: string | null;
  reason?: DeviationReason;
};

export type DeviationLink = {
  id: number;
  deviation_id: number;
  entity_type: string;
  entity_id: number;
};

export type ReagentDefinition = {
  id: number;
  code: string;
  name_ru: string;
  manufacturer: string | null;
  default_unit: string;
};

export type ReagentBatch = {
  id: number;
  reagent_definition_id: number;
  batch_code: string;
  lot: string | null;
  expiry_at: string | null;
  sterility_status: string;
  status: 'Active' | 'Expired' | 'Quarantine' | 'Blocked' | 'Depleted';
  qty_received: number;
  qty_on_hand: number;
  unit: string;
  created_at: string;
  reagent_definition?: ReagentDefinition;
};

export type ConsumableDefinition = {
  id: number;
  code: string;
  name_ru: string;
  category: string | null;
  units_per_package: number;
};

export type ConsumableBatch = {
  id: number;
  consumable_definition_id: number;
  batch_code: string;
  lot: string | null;
  expiry_at: string | null;
  status: 'Active' | 'Expired' | 'Quarantine' | 'Blocked' | 'Depleted';
  qty_received: number;
  qty_on_hand: number;
  unit: string;
  created_at: string;
  consumable_definition?: ConsumableDefinition;
};

export type InventoryTransaction = {
  id: number;
  item_type: string;
  item_id: number;
  tx_type: 'RECEIVE' | 'CONSUME' | 'ADJUST' | 'WRITE_OFF';
  qty: number;
  unit: string | null;
  performed_by: string | null;
  related_entity_type: string | null;
  related_entity_id: number | null;
  created_at: string;
};


export type MediaComponent = {
  id: number;
  name_ru: string;
  manufacturer: string | null;
  catalog_number: string | null;
  archived: boolean;
};

export type MediaRecipe = {
  id: number;
  recipe_code: string;
  name_ru: string;
  version: string;
  status: string;
  archived: boolean;
};

export type MediaBatch = {
  id: number;
  batch_code: string;
  recipe_id: number | null;
  prepared_by: string | null;
  prepared_at: string;
  expiry_at: string;
  status: string;
  qty_prepared: number;
  unit: string;
  notes: string | null;
  archived: boolean;
  recipe?: MediaRecipe;
};
