// Task model to represent task objects and their transformations
export class Task {
  constructor(data = {}) {
    this.id = data.id || null;
    this.user_id = data.user_id || null;
    this.title = data.title || '';
    this.description = data.description || '';
    this.deadline = data.deadline || null;
    this.context = data.context || 'Work';
    this.priority = data.priority || 3;
    this.status = data.status || 'pending';
    this.source = data.source || 'manual';
    this.source_id = data.source_id || null;
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
    this.priority_reason = data.priority_reason || null;
    this.scheduling_note = data.scheduling_note || null;
  }

  // Convert from database format
  static fromDB(data) {
    return new Task(data);
  }

  // Prepare for database insertion
  toDB() {
    const data = {
      user_id: this.user_id,
      title: this.title,
      description: this.description,
      deadline: this.deadline,
      context: this.context,
      priority: this.priority,
      status: this.status,
      source: this.source,
      source_id: this.source_id,
      created_at: this.created_at,
      updated_at: new Date().toISOString(),
      priority_reason: this.priority_reason,
      scheduling_note: this.scheduling_note
    };
    
    // Only include id if it exists (for updates)
    if (this.id) {
      data.id = this.id;
    }
    
    return data;
  }

  // Check if task is overdue
  isOverdue() {
    if (!this.deadline) return false;
    return new Date(this.deadline) < new Date();
  }

  // Mark task as complete
  complete() {
    this.status = 'completed';
    this.updated_at = new Date().toISOString();
    return this;
  }

  // Set task priority with reason
  setPriority(priority, reason = null) {
    this.priority = priority;
    if (reason) this.priority_reason = reason;
    this.updated_at = new Date().toISOString();
    return this;
  }
}
