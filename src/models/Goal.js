// Goal model to represent goal objects and their transformations
export class Goal {
  constructor(data = {}) {
    this.id = data.id || null;
    this.title = data.title || '';
    this.description = data.description || '';
    this.timeframe = data.timeframe || 'quarter';
    this.status = data.status || 'active';
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
    this.tasks = data.tasks || [];
    this.progress = data.progress || 0;
  }

  // Convert from database format
  static fromDB(data) {
    return new Goal(data);
  }

  // Prepare for database insertion
  toDB() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      timeframe: this.timeframe,
      status: this.status,
      created_at: this.created_at,
      updated_at: new Date().toISOString()
    };
  }

  // Calculate progress based on associated tasks
  calculateProgress(tasks = this.tasks) {
    if (!tasks || tasks.length === 0) return 0;
    
    const completedTasks = tasks.filter(task => task.status === 'completed');
    return Math.round((completedTasks.length / tasks.length) * 100);
  }

  // Archive this goal
  archive() {
    this.status = 'archived';
    this.updated_at = new Date().toISOString();
    return this;
  }

  // Reactivate an archived goal
  activate() {
    this.status = 'active';
    this.updated_at = new Date().toISOString();
    return this;
  }
}
