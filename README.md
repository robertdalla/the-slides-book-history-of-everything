# 📜 The History of Everything (i guess)

> *"The sun is a deadly laser."* — Some guy, probably.

Welcome to the **History of Everything**, a chaotic, AI-powered slide-book generator that attempts to summarize the entire timeline of existence in about 8 slides. It’s fast, it’s loud, it’s neon, and it’s probably 40% accurate at best.

## 🎭 The Vibe: What is this?

This app is a tribute to the fast-paced, deadpan, neon-soaked educational videos that defined a specific era of the internet. You know the ones. The ones where the narrator sounds like they’ve had three espressos and a mild existential crisis.

**How it works:**
1. **The Big Bang (Button):** You click "GENERATE".
2. **The Loading Screen:** We consult the timeline (and a very confused AI).
3. **The Slides:** You swipe through a series of "crudely drawn" masterpieces and captions that explain things like why we have oxygen now or why the Roman Empire decided to stop existing.
4. **The Conclusion:** A final, slightly depressing but funny message.

It’s educational! (In the same way that eating a vitamin gummy makes you a doctor).

---

## 🛠️ Technical Deep Dive

This isn't just a bunch of static images. This is a **Generative AI Pipeline** wrapped in a **Brutalist React Interface**.

### 🏗️ The Tech Stack

*   **Frontend Framework:** [React 19](https://react.dev/) (The latest and greatest, because history moves fast).
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) (Utility-first, neon-heavy, border-bold).
*   **Animations:** [Framer Motion](https://www.framer.com/motion/) (For those buttery-smooth card swipes and chaotic entrance animations).
*   **Icons:** [Lucide React](https://lucide.dev/) (Clean, crisp, and slightly too professional for this app).
*   **AI Engine:** [Google Gemini API](https://ai.google.dev/) (The brain behind the madness).
    *   `gemini-2.5-flash`: Generates the storyboard (JSON structure with titles, captions, and image prompts).
    *   `gemini-2.5-flash-image`: Generates the "crudely drawn" neon-on-black illustrations.

### 🧠 The Generative Pipeline

1.  **Storyboard Generation:** We send a system instruction to Gemini to act as a "creative director in the style of Bill Wurtz." It returns a structured JSON containing a title, 8 slides (text + image prompts), and a conclusion.
2.  **Image Synthesis:** For each slide, we take the `imagePrompt` and feed it into the image generation model. We explicitly ask for "minimalist, neon-colored, crudely drawn digital cartoons on a solid black background" to maintain the aesthetic.
3.  **Real-time Updates:** Slides are rendered as they are generated, so you don't have to wait for the whole universe to finish before you start reading about the Big Bang.

### 🎨 UI & Interaction Design

*   **Aesthetic:** "Brutalist Retro-Futurism." High-contrast neon colors (#ff00ff, #00ff00, #ffff00), solid black backgrounds, and `shadow-[8px_8px_0px_0px_#color]` for that chunky, tactile feel.
*   **Typography:** A mix of `font-mono` for that "raw data" look and bold, black headings for maximum impact.
*   **Swipe Interaction:** Implemented using Framer Motion's `drag` and `onDragEnd`. We calculate the swipe velocity and offset to determine if the user wants to go to the next slide or back to the previous one.
*   **Audio Synthesis:** No MP3s here! We use the **Web Audio API** to synthesize "jingles" and "blips" on the fly using oscillators (Square and Sine waves). It’s lightweight and sounds like a 1992 arcade cabinet.

### 📱 Responsive & Mobile-First

The app is designed to be "locked" to the viewport (`overflow-hidden`, `touch-action: none`). It feels like a native mobile app when added to the home screen, with cards that perfectly fit the thumb-swipe zone.

---

*Disclaimer: This app may cause sudden urges to learn history, buy a synthesizer, or question the nature of the universe. Use responsibly.*
