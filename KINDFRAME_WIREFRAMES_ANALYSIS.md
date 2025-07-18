# KindFrame Wireframes Analysis
## UI/UX Design Documentation

---

## 🎨 **Logo & Branding**
- **Logo File**: `KindFrame_Logo.png` (brain/heart hybrid icon)
- **Brand Colors**: Soft pastels with neurodivergent-friendly palette
- **Design Philosophy**: Clean, minimal, non-overwhelming interface

---

## 📱 **Screen-by-Screen Analysis**

### 1. **Welcome/Onboarding Screens**

#### **Initial Sign-Up Screen**
- **App Logo**: Rounded square with brain icon
- **Tagline**: "Structure that respects your brain and your bandwidth."
- **Primary CTA**: "Get Started"
- **Subtitle**: "Choose your preferred way to sign up"
- **Authentication Options**:
  - Continue with Google (with Google icon)
  - Continue with Apple (with Apple icon)  
  - Continue with Email (with envelope icon)
- **Secondary Actions**: "Already have an account? Log In"
- **Legal Text**: Terms of Service and Privacy Policy links
- **Why KindFrame Section**:
  - ✓ Gentle Structure: "Flexible routines that adapt to your needs"
  - 🖤 Energy Aware: "Respects your mental bandwidth"
  - 🖤 Safe Space: "No judgment, just support"

#### **Login Screen**
- **Header**: "Hey again." with "Ready to roll at your pace?"
- **Primary Options**: Continue with Apple (dark button), Continue with Google (light button)
- **Email Form**: Email field, Password field, "Log In" button
- **Helper Links**: "Reset password", "Create new account"

#### **Onboarding Flow (3 Steps)**
1. **Welcome Screen**:
   - "Enter your nickname"
   - "What would you like to be called?"
   - Input field with "Alex" example
   - Progress dots (1/3)

2. **Mode Selection**:
   - "Choose your mode" - "Pick what matches your current state"
   - 4 Options in 2x2 grid:
     - 🌙 "Calm & Low Sensory"
     - ⚡ "Hyper Focus Boost" (selected)
     - ⚫ "Normal"
     - 🛏️ "I Don't Want to Human Today"
   - Progress dots (2/3)

3. **Energy Rating**:
   - "Rate your energy" - "How are you feeling right now?"
   - Slider: 0 (Exhausted) to 10 (Energized), currently at ~7
   - Emoji feedback: 😊 "I'm feeling pretty good"
   - "Get Started" button
   - Progress dots (3/3)

---

### 2. **Main Dashboard/Home Screen**

#### **Today View (Primary Dashboard)**
- **Header**: "Hey, Alex" with profile avatar and **Theme Toggle Button** (sensory mode selector)
- **Search Bar**: "Search tasks, notes, features..."
- **Quick Access Grid (2x3)**:
  - 📅 "View My Day"
  - ⚙️ "Add Goals"
  - 🕐 "Pomodoro Timer"
  - ✅ "To-Do List"
  - 📝 "Notes"
  - 📋 "Kanban Board"
- **Bottom Row (3 items)**:
  - 😊 "Mood Tracker"
  - 🌙 "Let's Zone Out"
  - 🧠 "Brain Dump"

---

### 3. **Task Management Screens**

#### **Today's Tasks (Simple List View)**
- **Header**: "Today" with navigation arrows and **Home Button** (top left)
- **Task List**:
  - ☐ Study 📚 read
  - ☐ Morning workout 💪 health
  - ☐ Call mom ☎️ family
  - ☑️ Buy groceries 🛒 errands (checked/completed)
  - ☐ Prepare presentation 💼 work
  - ☐ Evening walk 🌙 sleep
- **Add Task**: "Write a task..." with voice, timer, and menu icons
- **Design Notes**: Color-coded tags, emoji categories, clean checkboxes

#### **Today's Schedule (Timeline View)**
- **Header**: "Today" with navigation, **Home Button** (top left), and info icon
- **Timeline Format**:
  - **08:00** - Event - High - Morning Workout 📅
  - **09:00** - Event - Medium - Team Stand-up 📅
  - **10:30** - Task - High - Review Project Proposal ☰
  - **12:00** - Event - Medium - Lunch with Sarah 📅
  - **14:00** - Todo - Low - Buy groceries ✓
  - **15:30** - Task - Medium - Update client presentation ☰
  - **17:00** - Todo - Low - Call mom ✓
  - **19:00** - Event - High - Dinner with family 📅
- **Bottom Actions**: 
  - 👋 "Help Me Prioritise" (primary)
  - 👁️ "View Less" (secondary)

#### **Kanban Board**
- **Header**: "Project Board" with **Home Button** (top left), notification and profile icons
- **Columns**: "Backlog" (3 items), "Todo", "In Progress", "Done"
- **Sample Cards**:
  - "Design user onboarding flow" - Design - High - Due: Jan 15 - Avatar
  - "API documentation update" - Development - Medium - Due: Jan 20 - Avatar
  - "User feedback analysis" - Research - Low - Due: Jan 25 - Avatar
- **Bottom Navigation**: Timeline, Add (+), Filter

---

### 4. **Goal Management**

#### **Add Goal Screen**
- **Header**: "Add Goal" with **Home Button** (top left) and checkmark
- **Form Fields**:
  - Goal Title (text input)
  - Subgoals: "Learn React" ❌, "Build Portfolio" ❌, "+ Add"
  - **Details Section**:
    - Start Date: Jan 15, 2025
    - Due Date: Mar 15, 2025
    - Priority: Medium (dropdown)
    - Tag Color: 5 color options (gray, blue, dark blue, navy, dark navy)
    - Description: "Add a short description..."
- **Existing Goals Section**:
  - "Frontend Development" - High priority
    - Tags: HTML/CSS, JavaScript, React
  - "Career Growth" - Medium priority
    - Tags: Networking, Skills
- **Add Button**: Floating action button

---

### 5. **Mood & Energy Tracking**

#### **Mood Tracker**
- **Header**: "Mood Tracker" with **Home Button** (top left) and info icon
- **Mind Energy Section**:
  - "How mentally energized do you feel?"
  - Slider: 0 to 10, currently at 5
  - Emoji: 😐 "5 - Feeling balanced"
  - "I don't know" option
- **Body Energy Section**:
  - "How physically energized do you feel?"
  - Slider: 0 to 10, currently at 5
  - Emoji: 😐 "5 - Feeling balanced"
  - "I don't know" option
- **Primary Action**: "Save Energy Levels" (blue button)

---

### 6. **Zone Out Area**

#### **Mindfulness Hub**
- **Header**: "Zone Out Area" with **Home Button** (top left) and info icon
- **Activity Options (4 large buttons)**:
  - 🎧 "ASMR"
  - 🎵 "Relaxing Music"
  - 🌬️ "Breathe with Me"
  - 🧘 "Guided Meditation"
- **Design**: Clean, spacious layout with large touch targets

---

### 7. **Calendar & Planning**

#### **Calendar View**
- **Header**: "July" with **Home Button** (top left), dropdown, search, calendar, and filter icons
- **Week View**: Sun-Sat layout
- **Sample Entries**:
  - July 2: "Things to Do"
  - July 5: "Meeting"
  - July 8: "Holiday"
  - July 11: "QRMenu"
  - July 13: "Workout"
  - July 15: "Aleena Onboarding"
  - July 17: "Team Call" + "Grocery"
  - July 20: "Birthday"
  - July 22: "Project Review" + "Gym"
  - July 25: "Training"
  - July 27: "Weekend Trip"
  - July 29: "Client Call"
- **Filter Toggles**: ✓ Todos, ✓ Events, ✓ Goals
- **Add Button**: Floating action button

---

### 8. **Brain Dump & Notes**

#### **Brain Dump Screen**
- **Header**: "Brain dump" with **Home Button** (top left) and info icon
- **Main Area**: "Write your thoughts here..." (large text area)
- **Bottom Toolbar**: 
  - 🎤 Voice input
  - ✓ Save/confirm
  - ✏️ Edit/format

---

## 🎨 **Sensory Theme System**

### **Theme Toggle Implementation**
- **Location**: Home screen header, next to profile avatar
- **Icon**: Theme/palette icon (🎨 or similar)
- **Behavior**: Opens modal/dropdown with three options
- **Persistence**: User selection saved in preferences
- **Real-time**: Immediate theme application without restart

### **Sensory Mode Specifications**

#### **Low Sensory Mode (Default)**
- **Purpose**: Reduce visual overwhelm, maximize accessibility
- **Color Characteristics**:
  - Muted, desaturated colors
  - High contrast for text readability
  - Minimal gradients or visual effects
  - Grayscale-leaning palette with subtle color accents
- **UI Elements**:
  - Simplified icons
  - Reduced emoji usage
  - Clean, minimal borders
  - Subtle shadows
- **Target Users**: ASD sensory sensitivities, migraines, focus issues

#### **Medium Sensory Mode**
- **Purpose**: Balanced visual experience for most users
- **Color Characteristics**:
  - Standard app colors as shown in wireframes
  - Moderate contrast levels
  - Balanced saturation
  - Standard emoji and icon usage
- **UI Elements**:
  - Full emoji categorization system
  - Standard shadows and effects
  - Balanced visual hierarchy
- **Target Users**: General neurodivergent population, mixed sensitivities

#### **High Sensory Mode**
- **Purpose**: Rich visual feedback for sensory seekers
- **Color Characteristics**:
  - Vibrant, saturated colors
  - Dynamic color responses
  - Rich gradients and effects
  - Full spectrum emoji usage
- **UI Elements**:
  - Enhanced visual feedback
  - Richer animations (when implemented)
  - Bold visual elements
  - Dynamic color coding
- **Target Users**: ADHD hyperfocus states, sensory seekers

### **Implementation Considerations**
- **CSS Variables**: Use CSS custom properties for theme switching
- **Component Props**: Pass theme context to all components
- **Accessibility**: Ensure WCAG compliance across all themes
- **Performance**: Optimize theme switching for instant feedback
- **Testing**: Validate readability and usability across all modes

---

## 🎨 **Design System Analysis**

### **Color Palette & Sensory Themes**
- **Default Theme**: Low Sensory (for first-time users)
- **Three Sensory Modes**:
  - **Low Sensory**: Muted colors, high contrast, minimal visual stimulation
  - **Medium Sensory**: Balanced colors, moderate contrast, standard visual elements
  - **High Sensory**: Vibrant colors, dynamic elements, rich visual feedback
- **Base Colors**:
  - **Primary**: Blue (#007AFF-like) - adapted per sensory level
  - **Secondary**: Soft grays and pastels - intensity varies by mode
  - **Success**: Green for completed items - saturation varies by mode
  - **Neutral**: Light grays for backgrounds - contrast varies by mode
  - **Accent**: Emoji colors for categories - brightness varies by mode

### **Typography**
- **Headers**: Bold, clean sans-serif
- **Body**: Regular weight, high readability
- **Sizes**: Clear hierarchy with good contrast

### **Iconography**
- **Style**: Mix of system icons and emoji
- **Categories**: Emoji-based visual categorization
- **Actions**: Clear, recognizable system icons

### **Layout Patterns**
- **Grid System**: 2x3 and 2x2 grids for main navigation
- **Cards**: Rounded corners, subtle shadows
- **Lists**: Clean, scannable with clear dividers
- **Forms**: Generous spacing, clear labels

### **Interaction Patterns**
- **Primary Actions**: Bold, high-contrast buttons
- **Secondary Actions**: Subtle, outline style
- **Navigation**: Clear back buttons and breadcrumbs
- **Input**: Multiple methods (voice, text, sliders)

---

## 🧠 **Neurodivergent-First Design Elements**

### **Cognitive Load Management**
- Limited options per screen (max 6-8 items)
- Clear visual hierarchy
- Generous white space
- Simple, predictable navigation

### **Sensory Considerations**
- Soft color palette
- No aggressive animations noted
- Clean, minimal interface
- Option for different modes (calm, focus, etc.)

### **Flexibility Features**
- Multiple input methods (voice, text)
- Customizable modes
- "I don't know" options for unclear states
- Energy-aware interface adaptation

### **Psychological Safety**
- Non-judgmental language ("Hey again", "Ready to roll at your pace?")
- "Zone Out" areas for overwhelm
- Gentle progress tracking
- No shame-based mechanics visible

---

## 📋 **Implementation Requirements**

### **Navigation Structure**
- Tab-based or dashboard-style main navigation
- **Universal Home Button**: Every page except home screen has a Home button in top left corner
- Consistent back button placement (when not home button)
- Search functionality across app
- Quick access patterns

### **Data Input Methods**
- Text input fields
- Voice recording capability
- Slider controls for energy/mood
- Checkbox/toggle interactions
- Date pickers
- Dropdown menus

### **Content Organization**
- Timeline views for schedules
- List views for tasks
- Card-based layouts for projects
- Calendar grid views
- Form-based input screens

### **Accessibility Features**
- Large touch targets
- **Sensory theme adaptation** (Low/Medium/High sensory modes)
- **Universal home navigation** from any screen
- Voice input integration
- Clear visual feedback
- Multiple interaction methods
- WCAG compliance across all sensory themes

---

*This wireframe analysis provides the foundation for implementing KindFrame's neurodivergent-first design principles while maintaining the clean, supportive aesthetic shown in the mockups.*