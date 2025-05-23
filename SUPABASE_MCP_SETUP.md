# Supabase MCP Server Setup Guide

## ✅ MCP Server Verified
The Supabase MCP server package `@supabase/mcp-server-supabase` is installed and ready!

## 🔧 Configuration Steps

### 1. Create Supabase Personal Access Token
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click your profile icon → **Settings**
3. Navigate to **Access Tokens** section
4. Click **Generate new token**
5. Name it: `Claude MCP Server`
6. Copy the token (you won't see it again!)

### 2. Your Project Details
- **Project URL**: `https://zkniqzkrqbmumymwdjho.supabase.co`
- **Project Reference**: `zkniqzkrqbmumymwdjho`
- **Database**: Your life-coach-ai database

### 3. Claude Desktop Configuration
Add this to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "YOUR_PERSONAL_ACCESS_TOKEN_HERE",
        "--project-ref",
        "zkniqzkrqbmumymwdjho"
      ]
    }
  }
}
```

### 4. Alternative: Read-Only Configuration
For safer read-only access to your database:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx", 
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "YOUR_PERSONAL_ACCESS_TOKEN_HERE",
        "--project-ref", 
        "zkniqzkrqbmumymwdjho",
        "--read-only"
      ]
    }
  }
}
```

## 🎯 What You'll Get

Once configured, you'll have access to powerful MCP tools:

### Database Operations
- `mcp_get_tables` - List all tables
- `mcp_describe_table` - Get table schema
- `mcp_query_database` - Run SQL queries
- `mcp_insert_data` - Insert records
- `mcp_update_data` - Update records
- `mcp_delete_data` - Delete records

### Schema Management
- `mcp_generate_types` - Generate TypeScript types
- `mcp_get_relationships` - View table relationships
- `mcp_analyze_schema` - Schema analysis

### Edge Functions
- `mcp_deploy_function` - Deploy Edge Functions
- `mcp_list_functions` - List deployed functions

## 🚀 Benefits for Your Project

1. **Direct Database Access**: Query your tasks, goals, and family data directly
2. **Schema Fixes**: Apply schema changes like fixing the family_goals table
3. **Data Analysis**: Run complex queries to understand your data
4. **Type Safety**: Generate TypeScript types for your database schema
5. **Real-time Debugging**: Investigate issues without leaving the conversation

## 📝 Example Usage

After setup, you could ask Claude:
- "Show me all tables in my database"
- "Fix the family_goals table schema"
- "Query all tasks created this week"
- "Generate TypeScript types for my database"
- "Show me the schema for the family_goals table"

## 🔒 Security Notes

- **Personal Access Token**: Keep this secure - it has full access to your Supabase project
- **Read-Only Mode**: Use `--read-only` flag for safer access
- **Project Scope**: The `--project-ref` flag restricts access to only your life-coach-ai project

## 📍 Next Steps

1. ✅ MCP server is ready to install
2. 🔄 Create your personal access token
3. ⚙️ Add configuration to Claude Desktop
4. 🧪 Test with "Show me my database tables"

Once configured, we can immediately fix your family_goals schema issue using the MCP tools!