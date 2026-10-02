import re
with open('code/frontend/src/Pages/SolveWorkspace.jsx', 'r') as f:
    content = f.read()

# 1. Subtle glow border on 3D viewport
content = content.replace(
    'border border-dark-border bg-dark-bg min-h-[320px]',
    'border border-dark-border bg-dark-bg shadow-[inset_0_0_30px_rgba(0,243,255,0.05)] min-h-[320px]'
)

# 2. Stat component drop shadow
stat_find = 'className={`text-lg font-bold font-mono ${tone}`}'
stat_replace = 'className={`text-lg font-bold font-mono ${tone} ${tone === "text-neon-green" ? "drop-shadow-[0_0_4px_rgba(255,255,255,0.2)]" : ""}`}'
content = content.replace(stat_find, stat_replace)

# 3. Hover effects on ModeButton
mode_btn_find = 'active\n          ? "border-neon-blue bg-neon-blue/10 text-neon-blue"\n          : "border-dark-border bg-dark-surface text-gray-300 hover:text-white"'
mode_btn_replace = 'active\n          ? "border-neon-blue bg-neon-blue/10 text-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.2)]"\n          : "border-dark-border bg-dark-surface text-gray-300 hover:text-white"'
content = content.replace(mode_btn_find, mode_btn_replace)

# 4. Cube solved Result Panel
solved_find = 'className="border-neon-green/50"'
solved_replace = 'className="border-neon-green/50 shadow-[0_0_20px_rgba(57,255,20,0.15)]"'
content = content.replace(solved_find, solved_replace)

solved_text_find = '<div className="text-neon-green font-bold text-sm mb-1">\n                Cube solved'
solved_text_replace = '<div className="text-neon-green font-bold text-sm mb-1">\n                🎉 Cube solved'
content = content.replace(solved_text_find, solved_text_replace)

# 5. Action buttons hover
action_btn_find1 = 'className="w-full py-2.5 rounded-lg border border-dark-border bg-dark-bg text-gray-300 text-xs cursor-pointer hover:text-white transition-colors"\n              >\n                Reset to scramble'
action_btn_replace1 = 'className="w-full py-2.5 rounded-lg border border-dark-border bg-dark-bg text-gray-300 text-xs cursor-pointer hover:text-white transition-colors hover:bg-gray-800/50 hover:shadow-sm"\n              >\n                Reset to scramble'
content = content.replace(action_btn_find1, action_btn_replace1)

action_btn_find2 = 'className="w-full py-2.5 rounded-lg border border-dark-border bg-dark-bg text-gray-300 text-xs cursor-pointer hover:text-white transition-colors"\n              >\n                New cube'
action_btn_replace2 = 'className="w-full py-2.5 rounded-lg border border-dark-border bg-dark-bg text-gray-300 text-xs cursor-pointer hover:text-white transition-colors hover:bg-gray-800/50 hover:shadow-sm"\n              >\n                New cube'
content = content.replace(action_btn_find2, action_btn_replace2)

with open('code/frontend/src/Pages/SolveWorkspace.jsx', 'w') as f:
    f.write(content)
