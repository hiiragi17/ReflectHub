export interface Framework {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  schema: FrameworkField[];
  icon?: string;
  color?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FrameworkField {
  id: string;
  label: string;
  placeholder: string;
  order: number;
  required: boolean;
  max_length?: number;
}
