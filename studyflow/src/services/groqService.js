const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const MODEL = "llama-3.3-70b-versatile";

async function callGroq(messages, temperature = 0.7, maxTokens = 4096) {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} — ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function organizeTopics(rawText) {
  const truncated = rawText.slice(0, 12000);
  const messages = [
    {
      role: "system",
      content: `You are a study material organizer. Given raw text extracted from a document, organize it into distinct topic-wise sections. Preserve ALL information — do not summarize or remove any content, just restructure it logically.

Return a JSON object with this exact structure:
{
  "topics": [
    {
      "title": "Topic Title",
      "content": "Full content for this topic, preserving all details from the original text"
    }
  ]
}

Rules:
- Create between 2 and 10 topics depending on the material
- Each topic should be a coherent, self-contained section
- Topic titles should be clear and descriptive
- Preserve all original information without summarizing`,
    },
    {
      role: "user",
      content: `Organize this study material into topics:\n\n${truncated}`,
    },
  ];

  const result = await callGroq(messages, 0.3, 4096);
  try {
    const parsed = JSON.parse(result);
    return parsed.topics || [];
  } catch {
    throw new Error("Failed to parse topic organization response");
  }
}

export async function generateQuiz(topicTitle, topicContent, questionCount) {
  const count = Math.min(Math.max(questionCount, 1), 50);
  const messages = [
    {
      role: "system",
      content: `You are a quiz generator for educational assessment. Generate multiple-choice questions that test understanding of the given topic material. Questions should range from basic recall to deeper comprehension.

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

Rules:
- Generate exactly ${count} questions
- correctAnswer is the 0-based index of the correct option
- Each question must have exactly 4 options
- Questions should test genuine understanding, not just memorization
- Explanations should be concise but helpful`,
    },
    {
      role: "user",
      content: `Generate ${count} quiz questions for the topic "${topicTitle}":\n\n${topicContent.slice(0, 8000)}`,
    },
  ];

  const result = await callGroq(messages, 0.5, 4096);
  try {
    const parsed = JSON.parse(result);
    return parsed.questions || [];
  } catch {
    throw new Error("Failed to parse quiz generation response");
  }
}

export async function evaluateTopic(topicTitle, score, total, answers) {
  const percentage = Math.round((score / total) * 100);
  const wrongAnswers = answers
    .filter((a) => !a.isCorrect)
    .map((a) => `Q: ${a.question} — Student chose: "${a.selected}" — Correct: "${a.correct}"`)
    .join("\n");

  const messages = [
    {
      role: "system",
      content: `You are an educational evaluator. Analyze the student's quiz performance and provide feedback.

Return a JSON object with this exact structure:
{
  "understanding": "strong" | "can_improve" | "weak",
  "feedback": "Detailed feedback paragraph about the student's understanding",
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Area to improve 1", "Area to improve 2"]
}`,
    },
    {
      role: "user",
      content: `Topic: "${topicTitle}"
Score: ${score}/${total} (${percentage}%)
${wrongAnswers ? `\nIncorrect answers:\n${wrongAnswers}` : "All answers were correct!"}`,
    },
  ];

  const result = await callGroq(messages, 0.4, 1024);
  try {
    return JSON.parse(result);
  } catch {
    return {
      understanding: percentage >= 70 ? "strong" : percentage >= 40 ? "can_improve" : "weak",
      feedback: `You scored ${score}/${total}. ${percentage >= 70 ? "Great work!" : "Keep studying this topic."}`,
      strengths: [],
      improvements: [],
    };
  }
}

export async function generateFinalEvaluation(results) {
  const summary = results.map((r) => ({
    topic: r.topicTitle,
    score: `${r.quizScore}/${r.totalQuestions}`,
    timeUsed: r.timeTaken,
    timeAllotted: r.timeAllotted,
    understanding: r.understanding,
  }));

  const messages = [
    {
      role: "system",
      content: `You are an educational evaluator providing a final assessment. Analyze the student's overall performance across all topics.

Return a JSON object with this exact structure:
{
  "overallUnderstanding": "strong" | "can_improve" | "weak",
  "overallFeedback": "Comprehensive feedback paragraph",
  "studyRecommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "topicInsights": [
    {
      "topic": "Topic name",
      "verdict": "Brief one-line insight"
    }
  ]
}`,
    },
    {
      role: "user",
      content: `Final evaluation for student:\n${JSON.stringify(summary, null, 2)}`,
    },
  ];

  const result = await callGroq(messages, 0.4, 2048);
  try {
    return JSON.parse(result);
  } catch {
    return {
      overallUnderstanding: "can_improve",
      overallFeedback: "Review completed. Check individual topic results for details.",
      studyRecommendations: [],
      topicInsights: [],
    };
  }
}
