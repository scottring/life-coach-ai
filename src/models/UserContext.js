// UserContext model to represent the user's current context
export class UserContext {
  constructor(data = {}) {
    this.id = data.id || null;
    this.user_id = data.user_id || null;
    this.current_focus = data.current_focus || 'Work';
    this.energy_level = data.energy_level || 'Medium';
    this.available_time = data.available_time || 60;
    this.location = data.location || null;
    this.active_from = data.active_from || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  // Convert from database format
  static fromDB(data) {
    return new UserContext(data);
  }

  // Prepare for database insertion
  toDB() {
    return {
      id: this.id,
      user_id: this.user_id,
      current_focus: this.current_focus,
      energy_level: this.energy_level,
      available_time: this.available_time,
      location: this.location,
      active_from: this.active_from,
      updated_at: new Date().toISOString()
    };
  }

  // Update a specific field
  updateField(field, value) {
    if (field in this) {
      this[field] = value;
      this.updated_at = new Date().toISOString();
    }
    return this;
  }

  // Get appropriate tasks based on context
  getContextFilter() {
    return {
      context: this.current_focus === 'All' ? undefined : this.current_focus
    };
  }

  // Check if the user has enough time for a task
  hasTimeFor(estimatedMinutes) {
    return this.available_time >= estimatedMinutes;
  }
}
