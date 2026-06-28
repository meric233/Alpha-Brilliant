# Week 1 Brainlift — All Hand-Written

## Tools and Workflows

I used Cursor with the Firebase plugin. I chose the persona and domain by myself, told these to Cursor, and let Cursor do an interview on me to complete writing the PRD.

## Prompting Strategies

The prompt when I asked Cursor to do an interview on me and write the PRD was good:

> "Nonono you are giving me too much stuffs you wrote. Give ME an interview on writing the PRD. Some information I now have:... If you have any more specifications you need on writing the PRD, ask me like an interview, not just decide by yourself. Once you have all info you need, give a text docuement of the PRD."

Several adjustments I asked Cursor to make were also pretty successful, such as adding more features to the simulation to make it more connected to the problem, and making the reward mechanism more "dramatic."

> "In parts 4 and 5 of lesson 1, also have a line showing the highest point of the projectile (if I remembered correctly it is relevant). And for some of the comparisons in lesson 2, when the user launches, remember the launch before and draw it as a dashed line trajectory. Overall, just add more features to the simulations to make it more relavent and intuitive for each question"

## Phase Decisions & POV (Brainlift)

**DOK1/DOK2:** I read let AI summarize Sweller's paper on Cognitive load [1]. The main idea is: student's cognitive load is very limited, so when students solve a regular problem and fill up their cognitive load, they have little cognitive load for actually learning. Hence, we should give students content and problems that reduce the students' cognitive load.

Two types of problems:

- **Worked examples:** We first show how to solve a problem step by step (worked example). Then we reduce the given steps and let the students finish the missing steps (half-worked example).
- **Goal free problems:** Given several quantities, we ask the students to calculate as many variables as they can, instead of just asking about one particular variable.

**DOK3:** My insight is that Sweller's concepts fit with teaching physics particularly well. Physics problems always (probably even more often than math) involve many variables. It is hard for students to establish relationships between all the variables all at once and get the final answer, so Sweller's idea on (half) worked examples and goal-free problems should effectively reduce students' cognitive load significantly and improve learning.

**DOK4 (hopefully spiky enough?):** Students will learn physics more effectively when we feed them with (half) worked examples and goal-free problems, instead of feeding them with problems that ask for a particular variable as in the AP tests.

## What I Shipped

So I shipped two new features, adding worked examples and goal free problems to lessons 3 and 4. The goal-free problems are graded by live AI since the students will describe the variables they calculated in their own words, and hard-coded grading will not be fair if the students' description was not predicted (but correct). AI also gives live suggestions to students when the variable they described isn't valid.

## What I Left Out

- I didn't add the above features in lessons 1 & 2 simply because lessons 1 & 2 doesn't have multi-step calculations.
- I also left out distributed retrieval since there are only 4 lessons on my app. There is not enough content to review regularly yet.

## Code Analysis

I believe AI wrote 100% of the code.

## Citations

[1] Sweller, J. (1988), Cognitive Load During Problem Solving: Effects on Learning. Cognitive Science, 12: 257-285. https://doi.org/10.1207/s15516709cog1202_4
