# Baby Steps
## Interactive Early Cultural Learning Game for Ugandan Children

### Overview
Baby Steps is an interactive mobile game designed to introduce young Ugandan children to their rich cultural heritage. By combining traditional storytelling, Luganda language immersion, and culturally themed quests, the game creates a dynamic and personalized learning experience for both children and their parents.

### Features
* **Interactive Story Modules:** Engage with culturally themed narratives that introduce Ugandan folklore.
* **Language Immersion Games:** Enhance listening and speaking skills in Luganda through interactive exercises.
* **Cultural Quests:** Explore traditional Ugandan culture with fun challenges and activities.
* **Personalized Learning Paths:** Adaptive content delivery tailored to each child's performance and learning pace.
* **Parental Dashboard:** Securely monitor and manage your child's progress and learning journey.
* **Gamified Elements:** Earn badges, rewards, and level up to keep learners motivated.
* **Offline Access:** Seamless gameplay and learning even in low or intermittent connectivity environments.

### Technology Stack
* **Frontend:** React Native
* **Game Engine:** React Native Game Engine
* **Physics Engine:** Matter.js
* **Backend:** Supabase
* **Local Storage:** SQLite / AsyncStorage for offline capabilities

### Architecture Overview
Baby Steps utilizes a modular and scalable architecture with the following key components:
* **User Management:** Secure user authentication, profile creation, and family (parent-child) management.
* **Learning Progress:** Real-time tracking of educational progress and achievement tracking.
* **Content Management:** Dynamic delivery and caching of educational content.
* **Analytics & Personalization:** Adaptive recommendations based on player interactions and learning patterns.
* **Game Engine:** Core gameplay mechanics and interactive experiences.
* **Offline Sync:** Robust data synchronization ensuring continuity during network disruptions.

### Getting Started
#### Prerequisites
* Node.js (v14.x or higher)
* npm or yarn
* React Native CLI or Expo CLI

#### Installation
1. **Clone the Repository:**
```
git clone https://github.com/AriyoX/baby-steps
```

2. **Navigate to the Project Directory:**
```
cd baby-steps
```

3. **Install Dependencies:**
  ```
  npm install
  ```
or
  ```
  yarn install
  ```

5. **Run the Application:**
* **iOS:**
  ```
  npx react-native run-ios
  ```
* **Android:**
  ```
  npx react-native run-android
  ```

### Usage
Once the app is installed, you can:
* Go through an interactive onboarding process that personalizes learning paths.
* Access engaging modules featuring storytelling, language lessons, and cultural quests.
* Monitor progress and achievements via the integrated parental dashboard.

### Authors
* **Ahumuza Ariyo Nimusiima** – Registration: 21/U/1657, Student Number: 2100701657
* **Serumaga Conrad David** – Registration: 22/U/6881, Student Number: 2100706881
* **Ojok Emmanuel Nsubuga** – Registration: 21/U/06816/PS, Student Number: 2100706816
* **Kahuma Andrew** – Registration: 21/U/04644/PS, Student Number: 2100704644

### License
This project is licensed under the MIT License. See the LICENSE file for details.
