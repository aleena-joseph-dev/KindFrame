# KindFrame - Neurodivergent-First Productivity App
## Complete Product Requirements & User Flow Documentation

---

## 📋 Product Requirements Document (PRD)

### **Core Information**
- **Title/Initiative**: Neurodivergents-first productivity management app
- **Date & Version**: 13/07/2025, V 1.0
- **Product Owner**: Aleena Joseph
- **Design Lead**: Aleena Joseph  
- **Tech Lead**: Aleena Joseph
- **Marketing Lead**: Aleena Joseph

### **🎯 Core Philosophy**
> "Productivity isn't about doing more – it's about suffering less while doing what matters."

### **👥 Target Audience**
Neurodivergent individuals (ADHD, ASD, Dyslexia, Anxiety, etc.)

### **🌟 Vision & Mission**
- **Vision**: Enable neurodivergent users to achieve productivity without compromising mental well-being
- **Mission**: Replace rigid productivity systems with neuroscience-backed, adaptable workflows

---

## 🎯 Objectives & Success Metrics

### **Business Objectives**
- **Strategic Need**: Capture underserved neurodivergent productivity market
- **Growth Lever**: Freemium conversion via AI features
- **Brand Value**: Position as neurodivergent-first design

### **User Objectives**
- **Core Objective**: Enable productivity without burnout/shame
- **Psychological Safety**: Replace guilt-driven mechanics. Be a safe, non-judgmental space where you can choose your pace and environment
- **Cognitive Equity**: Adapt to variable executive function & sensory needs

### **📊 Success Measurement**
- Task Initiation Rate
- Sensory mode selection
- Crisis Mode Utilization: Burnout prediction usage
- WAU (Weekly Active Users)

### **⚠️ Guardrail Metrics**
- App uninstalls after Crisis Mode use
- App uninstalls without any action

---

## 👤 User Personas

| Persona | Neurotype | Core Problems | Jobs to Be Done |
|---------|-----------|---------------|-----------------|
| **Ann** | ADHD + ASD | Task avoidance, time blindness | "Help me start a task, break the friction. Remind me to take adequate breaks so that I don't burnout easily" |
| **Lakshmi** | ASD + Sensory | Sensory overwhelm, ambiguity anxiety | "Make daily plans predictable, literal, with simple UI. Let me turn off features when it overwhelms me" |
| **Carol** | Dyslexia + Anxiety | Text decoding stress, time estimation shame | "Let me work without reading/writing pressure. I'm more comfortable with voice assisted apps and I prefer universal symbols and images over text." |

---

## 🔍 Problem Validation

| Evidence Source | Key Insight |
|----------------|-------------|
| Reddit r/ADHD | "Existing apps punish my variable attention spans" |
| Tiimo App Store reviews | 89% praise collapse/expand schedules for overwhelm |
| UC Berkeley ND study 2024 | 74% report abandonment due to "overdue" shame labels |

---

## 💡 Core Solution Features

### **🧠 Neuro-Adaptive Frameworks**
Adapts to your energy — shift tasks or dive deep. Stay focused on what matters, not everything at once.

### **🎨 Sensory Safe Mode**
Three-tier sensory theme system (Low/Medium/High sensory modes). One-tap override of triggers (sounds/colors/notifications). Customize UI intensity based on current sensory needs. Default: Low Sensory mode for first-time users.

### **🔍 Ambiguity Destroyer**
AI task decomposition to micro-steps, hand-holding to start.

### **⚙️ Highly Customizable**
Turn off features, customize features for each technique.

### **🎤 Voice Assistant**
Utilizes speech recognition and natural language processing to convert user input into actionable tasks or organized notes.

### **⚡ Energy Tracker**
To help users become more self-aware of their energy patterns and use that insight to plan tasks more effectively.

### **🧘 Zone Out Area**
It gives users a moment to breathe and unwind whenever they need it most.

---

## 🗺️ User Flow Analysis

Based on the Miro diagrams provided, here's the comprehensive user flow breakdown:

### **🔐 Authentication & Onboarding Flow**
1. **Launch App** → **App Sign-in** → **Google Sign-In** / **Email Sign-Up**
2. **Onboarding Step 1**: Set Neurotype
3. **Onboarding Step 2**: Rate Energy Level
4. **Onboarding Step 3**: Rate Energy Level
5. **Choose Task & Check-in** → **Complete Check-in** → **Save & Log Energy Levels**

### **⚡ Energy & Mood Tracking Flow**
1. **Launch App** → **Navigate to Mood Tracker** → **Start Mood Check-in**
2. **Input Mood & Body Energy** → **Review or Redirect**
3. **Energy Level Decision Points**:
   - **High Energy** → Journal or Core Memory → Create Core Memory
   - **Medium Energy** → Journal Screen
   - **Low Energy** → Journal or Zone Out and Relax → Zone Out & Relax Screen

### **🧘 Zone Out & Mindfulness Flow**
1. **Open App** → **Navigate to Zone Out Area** → **Enter Zone Out Screen**
2. **Intent: Minute Break or Emotion Regulation** → **Mindfulness Activities**:
   - **Guided Meditation** → **Redirect**
   - **Journal** → **Redirect** 
   - **Grounding Activities** → **Redirect**
   - **Relaxing Music** → **Redirect**
   - **Breathe with Me** → **Redirect**
3. **Engage with corresponding activity** → **Continue or Exit** → **Dashboard** / **Go to Main Dashboard** / **Return to Zone Out Area**

### **📝 Task & Notes Management Flow**
1. **Open Brain Dump Screen** → **Choose Input Method**:
   - **Text Input** → **Text Input** → **Choose Input Method**
   - **Voice Input** → **Voice Input** → **Transcribe Voice**
2. **Note/Journal Entry** → **Save as Note** / **Save as Journal Entry**
3. **Edit & Save** → **Return to Brain Dump Home**
4. **Save as Core Memory** / **Discard** / **Discard & Change Path**

### **📂 Notes Organization Flow**
1. **Tap Notes Icon** → **View Existing Notes** → **Add New Content**:
   - **Create Folder** → **Name Folder** → **Create Note**
   - **Create Note** → **Choose Input Method** → **Voice Input** / **Text Input**
2. **Categories Note** → **Organize & Save**
3. **Search-Based Project** → **Create Save/Edit** → **Admin & Confirm** → **Note Saved** → **Return to Notes Overview**

### **📋 Kanban Board & Task Management**
1. **Select Kanban Board** → **Open** → **Kanban Board Screen** → **View** → **View Layout**
2. **Interact** → **Interact with Task Cards** → **Manage** → **Use Bottom Bar Controls**
3. **Create Task** → **Add title, priority, reminder, date, sub-task, description, priority, status** → **Task View Updated**
4. **Apply Filter** → **Priority** / **Task Status** / **Date** / **Tag/Label** → **Filter Applied** → **Update**

### **✅ To-Do List Management**
1. **Open To-Do Section** → **Arrive at To-Do Screen** → **Interact with To-Do List**
2. **Only 3 To-Do Items are Shown At A Time** → **Create New To-Do Task** → **Voice/natural language processing** → **To-Do List Created**
3. **Time, Reminder & Tag Set** → **Priority** / **Filter** → **Time/Date** / **Number Of Task To Be Shown** / **Tag/Label** → **Apply** → **Edit/Modify List** → **Cross off tasks/clear all option**
4. **Create & Save Routine** → **Routine Created** → **Add To To-Do List/Show Based on Frequency**

### **🎯 Goals Management Flow**
1. **Access Add Goal Screen** → **Enter Goal Title** → **Add/Edit sub goal, timeline, priority, description etc** → **Save Goal**
2. **View Goals** (can loop back to Enter Goal Title)
3. **Click on tag of a task/todo List** → **View Goals**

### **🏠 Home Dashboard & Navigation**
1. **Home Screen** → **Tap** → **View My Day Card** / **Calendar Screen** → **Tap Today's Date** / **System Notification** → **Tap** → **Plan Your Day Reminder**
2. **View My Day Screen** → **Tap** → **Add New Item** / **Filter** → **Filter by time, priority, tag** / **Selected Date** → **Detailed Period View** → **Quick Access On Tap**
3. **Help Me Prioritise** → **Suggested Reordering** → **Highlight Missed Items** → **Snooze Tasks** / **View Less**

---

## 🎨 Design Principles (Inferred from Flows)

### **🔄 Adaptive Navigation**
- Multiple pathways to the same functionality
- **Universal Home Button** on every screen except home screen (top left)
- Quick access patterns for energy-dependent states
- Non-linear flow accommodation

### **⚡ Energy-Aware Design**
- Energy level checkpoints throughout flows
- Adaptive UI based on current energy state
- Crisis mode and burnout prevention built-in

### **🎯 Cognitive Load Management**
- Limited options principle (3 to-dos max)
- Voice-first interaction options
- Visual over text when possible
- Collapsible/expandable interfaces

### **🛡️ Psychological Safety**
- No shame-based language or mechanics
- Flexible deadline management
- "Zone out" areas for overwhelm
- Non-judgmental progress tracking

### **🔧 Hyper-Customization**
- Feature toggle capabilities
- Sensory mode options
- Personalized workflow adaptations
- Individual neurotype considerations

---

## 🚀 Development Priorities

### **Phase 1: Core MVP**
1. Basic authentication & onboarding
2. Energy tracking & mood check-in
3. Simple task creation & management
4. Zone out area basics

### **Phase 2: Intelligence Layer**
1. AI task decomposition
2. Energy pattern recognition
3. Burnout prediction
4. Voice processing enhancement

### **Phase 3: Advanced Features**
1. Comprehensive goal management
2. Advanced filtering & organization
3. Routine automation
4. Social features (if applicable)

---

## 📱 Technical Considerations

### **Accessibility Requirements**
- Voice-first interfaces
- High contrast modes
- Sensory-safe color palettes
- Text-to-speech support
- Gesture alternatives for all interactions

### **Performance Requirements**
- Instant response for energy tracking
- Offline capability for core functions
- Minimal cognitive load during loading states
- Crisis mode must be ultra-fast access

### **Privacy & Security**
- Local-first data storage where possible
- Encrypted personal health information
- Transparent data usage policies
- User control over data sharing

---

*This document serves as the foundational reference for all KindFrame development decisions and should be consulted for feature prioritization, design choices, and user experience considerations.*