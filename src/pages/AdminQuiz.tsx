import { useState, useEffect } from "react";
import { Shell } from "@/components/Shell";
import { ref, get, set, push, remove } from "firebase/database";
import { db } from "@/firebase";

export default function AdminQuiz() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("");

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    const snap = await get(ref(db, 'quizzes'));
    if (snap.exists()) {
      const data = snap.val();
      const list = Object.keys(data).map(k => ({ id: k, ...data[k] }));
      setQuestions(list);
    } else {
      setQuestions([]);
    }
  };

  const handleAddQuestion = async (e: any) => {
    e.preventDefault();
    if (!questionText || options.some(o => !o) || !correctAnswer) {
      alert("Please fill all fields and select a correct answer");
      return;
    }
    const newQ = {
      question: questionText,
      options: options,
      correctAnswer: correctAnswer,
      createdAt: Date.now()
    };
    const newRef = push(ref(db, 'quizzes'));
    await set(newRef, newQ);
    setQuestionText("");
    setOptions(["", "", "", ""]);
    setCorrectAnswer("");
    loadQuestions();
  };

  const handleDelete = async (id: string) => {
    await remove(ref(db, `quizzes/${id}`));
    loadQuestions();
  };

  const handleOptionChange = (index: number, val: string) => {
    const newOpts = [...options];
    newOpts[index] = val;
    setOptions(newOpts);
  };

  return (
    <Shell>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 className="page-title">Admin Quiz Management</h1>
        <p className="muted">Upload multiple choice questions for the weekly quiz. Only on Wednesdays!</p>

        <div className="card" style={{ padding: 20, marginBottom: 30 }}>
          <h3>Add New Question</h3>
          <form onSubmit={handleAddQuestion}>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Question</label>
              <input className="input" value={questionText} onChange={e => setQuestionText(e.target.value)} required />
            </div>
            {options.map((opt, i) => (
              <div key={i} className="field" style={{ marginBottom: 12 }}>
                <label>Option {i + 1}</label>
                <input className="input" value={opt} onChange={e => handleOptionChange(i, e.target.value)} required />
              </div>
            ))}
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Correct Answer (must exactly match one of the options)</label>
              <select className="input" value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)} required>
                <option value="">Select correct option...</option>
                {options.map((opt, i) => opt ? <option key={i} value={opt}>{opt}</option> : null)}
              </select>
            </div>
            <button className="btn" style={{ background: "#10b981", color: "#000", fontWeight: "bold" }}>Add Question</button>
          </form>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3>Current Questions ({questions.length})</h3>
          {questions.length === 0 ? (
             <p className="muted">No questions uploaded.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {questions.map(q => (
                <div key={q.id} style={{ background: "rgba(255,255,255,0.05)", padding: 16, borderRadius: 12 }}>
                  <p style={{ fontWeight: "bold", margin: "0 0 8px" }}>{q.question}</p>
                  <ul style={{ margin: "0 0 12px", paddingLeft: 20 }}>
                    {q.options.map((o: string, i: number) => (
                      <li key={i} style={{ color: o === q.correctAnswer ? "#10b981" : "var(--muted)", fontWeight: o === q.correctAnswer ? "bold" : "normal" }}>
                        {o} {o === q.correctAnswer && "(Correct)"}
                      </li>
                    ))}
                  </ul>
                  <button className="btn btn-danger" onClick={() => handleDelete(q.id)}>Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
