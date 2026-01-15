/**
 * SkillSwap - Icon Pack Integration Guide
 * How to add professional icons to your UI
 */

## 🎨 Current Icon Implementation

The UI currently uses **Unicode emojis** for icons:
- 📊 Dashboard
- 👨‍🏫 Tutors
- 🎓 Students
- 🏆 Achievements
- 🤖 AI Tutor
- ⚙️ Settings
- 🚪 Logout
- 🔔 Notifications
- 🔍 Search
- ⭐ Ratings

## 📦 Recommended Icon Packs

### Option 1: Font Awesome (Most Popular)
```html
<!-- Add to <head> in index-modern.html -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
```

Usage:
```html
<i class="fa-solid fa-chart-line"></i>  <!-- Dashboard -->
<i class="fa-solid fa-chalkboard-user"></i>  <!-- Tutors -->
<i class="fa-solid fa-graduation-cap"></i>  <!-- Students -->
<i class="fa-solid fa-trophy"></i>  <!-- Achievements -->
```

### Option 2: Heroicons (Tailwind Style)
```html
<!-- Use as SVG sprites -->
<svg class="icon"><use href="#heroicon-chart-bar"></use></svg>
```

### Option 3: Material Icons
```html
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
```

Usage:
```html
<span class="material-icons">dashboard</span>
<span class="material-icons">school</span>
<span class="material-icons">emoji_events</span>
```

## 🔧 How to Replace Emoji Icons

### Step 1: Add Icon Library
In `index-modern.html`, add to `<head>`:
```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
```

### Step 2: Update Icon Styles
In `modern-ui.css`, add:
```css
.sidebar-nav-item-icon i,
.profile-section-icon i {
  font-size: inherit;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Step 3: Replace in JavaScript
In `app-modern.js`, update the `Components.sidebar()` function:

**Before:**
```javascript
<span class="sidebar-nav-item-icon">📊</span>
<span>Dashboard</span>
```

**After:**
```javascript
<span class="sidebar-nav-item-icon"><i class="fa-solid fa-chart-line"></i></span>
<span>Dashboard</span>
```

## 🎯 Icon Mappings

### Font Awesome 6 Icons

| Page | Current | Font Awesome | Class |
|------|---------|-------------|-------|
| Dashboard | 📊 | 📈 | `fa-solid fa-chart-line` |
| Search | 🔍 | 🔍 | `fa-solid fa-magnifying-glass` |
| Tutors | 👨‍🏫 | 👨‍🏫 | `fa-solid fa-chalkboard-user` |
| Students | 🎓 | 🎓 | `fa-solid fa-graduation-cap` |
| Achievements | 🏆 | 🏆 | `fa-solid fa-trophy` |
| AI Tutor | 🤖 | 🤖 | `fa-solid fa-robot` |
| Settings | ⚙️ | ⚙️ | `fa-solid fa-gear` |
| Logout | 🚪 | 🚪 | `fa-solid fa-right-from-bracket` |
| Notifications | 🔔 | 🔔 | `fa-solid fa-bell` |
| User | 👤 | 👤 | `fa-solid fa-user` |
| Calendar | 📅 | 📅 | `fa-solid fa-calendar-days` |
| Clock | 🕐 | 🕐 | `fa-solid fa-clock` |
| Message | 💬 | 💬 | `fa-solid fa-message` |
| Star | ⭐ | ⭐ | `fa-solid fa-star` |
| Plus | ➕ | ➕ | `fa-solid fa-plus` |

### Complete Replacement Code

Create a new file: `public/js/icon-replacer.js`

```javascript
// Icon replacement utility
const IconReplacer = {
  icons: {
    'dashboard': '<i class="fa-solid fa-chart-line"></i>',
    'search': '<i class="fa-solid fa-magnifying-glass"></i>',
    'tutors': '<i class="fa-solid fa-chalkboard-user"></i>',
    'students': '<i class="fa-solid fa-graduation-cap"></i>',
    'achievements': '<i class="fa-solid fa-trophy"></i>',
    'ai-tutor': '<i class="fa-solid fa-robot"></i>',
    'settings': '<i class="fa-solid fa-gear"></i>',
    'logout': '<i class="fa-solid fa-right-from-bracket"></i>',
    'notifications': '<i class="fa-solid fa-bell"></i>',
    'user': '<i class="fa-solid fa-user"></i>',
    'calendar': '<i class="fa-solid fa-calendar-days"></i>',
    'clock': '<i class="fa-solid fa-clock"></i>',
    'message': '<i class="fa-solid fa-message"></i>',
    'star': '<i class="fa-solid fa-star"></i>',
    'plus': '<i class="fa-solid fa-plus"></i>',
    'filter': '<i class="fa-solid fa-sliders"></i>',
    'menu': '<i class="fa-solid fa-bars"></i>',
  },
  
  get(name) {
    return this.icons[name] || '<i class="fa-solid fa-circle"></i>';
  }
};

// Usage in Components
const icon = IconReplacer.get('dashboard');
```

## 🎨 Custom SVG Icons

If you prefer custom SVGs:

### Create Icon Sprite
`public/icons/sprite.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
  <symbol id="icon-dashboard" viewBox="0 0 24 24">
    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
  </symbol>
  <!-- Add more icons -->
</svg>
```

### Usage
```html
<svg class="icon">
  <use href="icons/sprite.svg#icon-dashboard"></use>
</svg>
```

### CSS for SVG Icons
```css
.icon {
  width: 24px;
  height: 24px;
  fill: currentColor;
  display: inline-block;
  vertical-align: middle;
}
```

## 🚀 Quick Implementation

### 1. Add Font Awesome (Easiest)

**In index-modern.html:**
```html
<head>
  <!-- ... other tags ... -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>
```

**In app-modern.js, update sidebar() function:**
```javascript
sidebar() {
  return `
    <aside class="sidebar ${AppState.sidebarOpen ? '' : 'collapsed'}" id="sidebar">
      <!-- ... header ... -->
      
      <nav class="sidebar-nav">
        <a href="#" class="sidebar-nav-item" data-page="dashboard">
          <span class="sidebar-nav-item-icon"><i class="fa-solid fa-chart-line"></i></span>
          <span>Dashboard</span>
        </a>
        
        <div class="sidebar-nav-group">
          <div class="sidebar-nav-parent" data-group="tutors">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="sidebar-nav-item-icon"><i class="fa-solid fa-chalkboard-user"></i></span>
              <span>Tutors</span>
            </div>
            <span class="sidebar-nav-toggle"><i class="fa-solid fa-chevron-down"></i></span>
          </div>
          <!-- ... -->
        </div>
        
        <div class="sidebar-nav-group">
          <div class="sidebar-nav-parent" data-group="students">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="sidebar-nav-item-icon"><i class="fa-solid fa-graduation-cap"></i></span>
              <span>Students</span>
            </div>
            <span class="sidebar-nav-toggle"><i class="fa-solid fa-chevron-down"></i></span>
          </div>
          <!-- ... -->
        </div>
        
        <a href="#" class="sidebar-nav-item" data-page="achievements">
          <span class="sidebar-nav-item-icon"><i class="fa-solid fa-trophy"></i></span>
          <span>Achievements</span>
        </a>
        
        <a href="#" class="sidebar-nav-item" data-page="ai-tutor">
          <span class="sidebar-nav-item-icon"><i class="fa-solid fa-robot"></i></span>
          <span>AI Tutor</span>
        </a>
      </nav>
      
      <div class="sidebar-footer">
        <a href="#" class="sidebar-nav-item" data-page="settings">
          <span class="sidebar-nav-item-icon"><i class="fa-solid fa-gear"></i></span>
          <span>Settings</span>
        </a>
        <a href="#" class="sidebar-nav-item" onclick="logout()">
          <span class="sidebar-nav-item-icon"><i class="fa-solid fa-right-from-bracket"></i></span>
          <span>Logout</span>
        </a>
      </div>
    </aside>
  `;
}
```

**Update topbar() function:**
```javascript
topbar() {
  return `
    <div class="topbar">
      <div class="topbar-left">
        <button class="menu-toggle" onclick="toggleSidebar()">
          <i class="fa-solid fa-bars"></i>
        </button>
      </div>
      <div class="topbar-right">
        <button class="notification-btn" onclick="showNotifications()">
          <i class="fa-solid fa-bell"></i>
          <span class="notification-badge">${AppState.notifications}</span>
        </button>
        <button class="user-menu-btn" onclick="Router.navigate('profile')">
          ${Utils.getInitials(MockData.currentUser.firstName + ' ' + MockData.currentUser.lastName)}
        </button>
      </div>
    </div>
  `;
}
```

**Update search icon:**
```javascript
<span class="search-icon"><i class="fa-solid fa-magnifying-glass"></i></span>
```

**Update filter button:**
```javascript
<button class="filter-btn"><i class="fa-solid fa-sliders"></i></button>
```

## 🎨 Icon Sizing

Add to `modern-ui.css`:
```css
.fa-solid,
.fa-regular,
.fa-brands {
  font-size: inherit;
  line-height: inherit;
}

.sidebar-nav-item-icon i {
  font-size: 1.25rem;
}

.search-icon i {
  font-size: 1.5rem;
}

.notification-btn i {
  font-size: 1.5rem;
}
```

## 📦 Alternative: Use Your Own Icons

If you have custom icon files:

```
public/
├── icons/
│   ├── dashboard.svg
│   ├── search.svg
│   ├── tutors.svg
│   └── ...
```

**Usage:**
```html
<span class="sidebar-nav-item-icon">
  <img src="icons/dashboard.svg" alt="Dashboard" class="icon">
</span>
```

**CSS:**
```css
.icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}
```

## ✨ Pro Tips

1. **Use Font Awesome for consistency** - Largest icon library
2. **Keep emoji fallbacks** - Works without internet
3. **Use SVG for custom branding** - Perfect for logo icons
4. **Consider icon color** - Use `currentColor` for theme compatibility
5. **Test icon sizes** - Ensure readability at all sizes

## 🎯 Recommended Approach

**Best Practice:** Use Font Awesome for all UI icons, but keep your custom logo images.

This gives you:
- ✅ Professional appearance
- ✅ Consistent sizing
- ✅ Easy color theming
- ✅ Accessibility (screen readers)
- ✅ Scalability (vector)

---

**Current Status:** UI works perfectly with emoji icons (no dependencies)

**Next Step:** Add Font Awesome CDN link and update icon references for a more professional look!
