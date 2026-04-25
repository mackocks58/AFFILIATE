import { useState, useEffect, useRef } from "react";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/context/AuthContext";
import { ref, get, update } from "firebase/database";
import { db } from "@/firebase";

export default function QuizTask() {
  const { user, userData } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [earned, setEarned] = useState(0);

  const [taskConfig, setTaskConfig] = useState<{ allowedDays: number[], baseReward: number } | null>(null);

  const dayOfWeek = new Date().getDay();
  const allowedDays = taskConfig?.allowedDays || [3];
  const isAvailable = allowedDays.includes(dayOfWeek);
  
  const todayStr = new Date().toDateString();
  const alreadyDone = userData?.lastQuizDate === todayStr;

  const stateRef = useRef({
    answers, submitted, questions, userData
  });

  useEffect(() => {
    stateRef.current = { answers, submitted, questions, userData };
  });

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    const snap = await get(ref(db, 'quizzes'));
    if (snap.exists()) {
      const data = snap.val();
      setQuestions(Object.keys(data).map(k => ({ id: k, ...data[k] })));
    }
    const cfgSnap = await get(ref(db, 'settings/tasks/quiz'));
    if (cfgSnap.exists()) {
      setTaskConfig(cfgSnap.val());
    } else {
      setTaskConfig({ allowedDays: [3], baseReward: 300 });
    }
  };

  const getCurrency = (c: string) => {
    if (c === "Zambia") return "ZMW";
    if (c === "Burundi") return "BIF";
    if (c === "Mozambique") return "MZN";
    if (c === "Congo") return "CDF";
    return "TZS";
  };

  const getRate = (c: string) => {
    const base = taskConfig?.baseReward || 300;
    // Scale proportionally if default is 300
    // ZMW: 4, BIF: 350, MZN: 9, CDF: 300 when TZS is 300
    const ratio = base / 300;

    if (c === "Zambia") return 4 * ratio;
    if (c === "Burundi") return 350 * ratio;
    if (c === "Mozambique") return 9 * ratio;
    if (c === "Congo") return 300 * ratio;
    return base;
  };

  const handleSubmit = async (forceAnswers?: Record<string, string>) => {
    const state = stateRef.current;
    if (state.submitted) return;
    
    setSubmitted(true);
    stateRef.current.submitted = true;

    const currentAnswers = forceAnswers || state.answers;
    let correctCount = 0;
    state.questions.forEach(q => {
      if (currentAnswers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    const perc = Math.round((correctCount / state.questions.length) * 100) || 0;
    setScore(correctCount);
    setPercentage(perc);

    const country = state.userData?.country || "Tanzania";
    const amountEarned = correctCount * getRate(country);
    setEarned(amountEarned);

    // Update Firebase
    if (user) {
      await update(ref(db, `users/${user.uid}`), {
        lastQuizDate: todayStr,
        quizEarnings: Number(state.userData?.quizEarnings || 0) + amountEarned
      });
    }
  };

  useEffect(() => {
    if (!started || submitted) return;

    const handleCheat = () => {
      handleSubmit(stateRef.current.answers);
      alert("You left or minimized the quiz page! Your quiz has been automatically submitted to prevent cheating.");
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") handleCheat();
    };

    window.addEventListener("blur", handleCheat);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleCheat);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [started, submitted]);

  const handleSelect = (qId: string, opt: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qId]: opt }));
  };

  if (!taskConfig) {
    return (
      <Shell>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 40, color: "var(--accent)" }}></i>
        </div>
      </Shell>
    );
  }

  if (!isAvailable) {
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <i className="fa-solid fa-calendar-xmark" style={{ fontSize: 60, color: "var(--muted)", marginBottom: 20 }}></i>
          <h2>Not Available Today</h2>
          <p className="muted">The Weekly Quiz is only available on selected days. Check back later to earn rewards!</p>
        </div>
      </Shell>
    );
  }

  if (alreadyDone) {
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <i className="fa-solid fa-circle-check" style={{ fontSize: 60, color: "#10b981", marginBottom: 20 }}></i>
          <h2>Quiz Completed!</h2>
          <p className="muted">You have already completed this week's quiz. Great job!</p>
          <p style={{ fontSize: 20, color: "var(--accent)" }}>See you next time!</p>
        </div>
      </Shell>
    );
  }

  if (questions.length === 0) {
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <h2>No Quiz Yet</h2>
          <p className="muted">Please wait for the admin to upload the questions.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 className="page-title">Weekly Quiz</h1>
        <p className="muted">Test your knowledge and earn rewards. Do not close or minimize this page once started!</p>

        {!started ? (
          <div className="card" style={{ padding: 40, textAlign: "center", background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 8, 22, 0.95))", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
            <h2 style={{ color: "#10b981", marginBottom: 16 }}>Ready to begin?</h2>
            <p style={{ marginBottom: 24 }}>You will earn <strong>{getRate(userData?.country || "Tanzania")} {getCurrency(userData?.country || "Tanzania")}</strong> for each correct answer. Note: If you leave this page, your quiz will be auto-submitted.</p>
            <button 
              className="btn breathe" 
              onClick={() => setStarted(true)} 
              style={{ background: "#10b981", color: "#000", fontWeight: "bold", padding: "16px 32px", fontSize: 18 }}
            >
              Start Quiz
            </button>
          </div>
        ) : (
          <div>
            {submitted && (
              <div className="card" style={{ padding: 24, marginBottom: 24, textAlign: "center", background: "rgba(16, 185, 129, 0.1)", border: "1px solid #10b981" }}>
                <h2 style={{ color: "#10b981", margin: "0 0 12px" }}>Quiz Results</h2>
                <div style={{ fontSize: 48, fontWeight: 900, color: percentage >= 50 ? "#10b981" : "#ef4444", marginBottom: 12 }}>
                  {percentage}%
                </div>
                <p style={{ margin: "0 0 8px" }}>You scored {score} out of {questions.length} correct.</p>
                <p style={{ fontSize: 20, fontWeight: "bold", color: "var(--accent)", margin: 0 }}>
                  You earned +{earned} {getCurrency(userData?.country || "Tanzania")}
                </p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {questions.map((q, idx) => (
                <div key={q.id} className="card" style={{ padding: 24 }}>
                  <h3 style={{ margin: "0 0 16px" }}>{idx + 1}. {q.question}</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {q.options.map((opt: string, i: number) => {
                      const isSelected = answers[q.id] === opt;
                      const isCorrect = q.correctAnswer === opt;
                      
                      let bg = "rgba(255,255,255,0.05)";
                      let border = "1px solid rgba(255,255,255,0.1)";
                      let iconColor = "var(--muted)";
                      let iconClass = "fa-regular fa-circle";

                      if (submitted) {
                        if (isCorrect) {
                          bg = "rgba(16, 185, 129, 0.1)";
                          border = "1px solid #10b981";
                          iconColor = "#10b981";
                          iconClass = "fa-solid fa-circle-check";
                        } else if (isSelected && !isCorrect) {
                          bg = "rgba(239, 68, 68, 0.1)";
                          border = "1px solid #ef4444";
                          iconColor = "#ef4444";
                          iconClass = "fa-solid fa-circle-xmark";
                        }
                      } else if (isSelected) {
                        bg = "rgba(56, 189, 248, 0.1)";
                        border = "1px solid #38bdf8";
                        iconColor = "#38bdf8";
                        iconClass = "fa-solid fa-circle-dot";
                      }

                      return (
                        <div 
                          key={i} 
                          onClick={() => handleSelect(q.id, opt)}
                          style={{ 
                            display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", 
                            background: bg, border, borderRadius: 12, 
                            cursor: submitted ? "default" : "pointer",
                            transition: "all 0.2s"
                          }}
                        >
                          <i className={iconClass} style={{ color: iconColor, fontSize: 20 }}></i>
                          <span style={{ fontSize: 16 }}>{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {!submitted && (
              <button 
                className="btn" 
                onClick={() => handleSubmit()} 
                style={{ width: "100%", padding: 16, marginTop: 24, background: "#38bdf8", color: "#000", fontWeight: "bold", fontSize: 18 }}
              >
                Submit Answers
              </button>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
