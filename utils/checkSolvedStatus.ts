import { CodeforcesSubmission } from "@/types/Codeforces";
import { SessionProblem } from "@/types/SessionProblem";

const checkSolvedStatus = (
  sessionProblems: SessionProblem[],
  submissions: CodeforcesSubmission[],
): SessionProblem[] => {
  return sessionProblems.map((problem) => {
    // already marked solved, skip
    if (problem.solved_time !== null) return problem;

    // find a successful submission matching this problem
    const match = submissions.find(
      (s) =>
        s.verdict === "OK" &&
        s.problem.contestId === problem.contest_id &&
        s.problem.index === problem.index,
    );

    // if match found, set solved_time to now
    if (match) {
      return { ...problem, solved_time: Date.now() };
    }

    return problem;
  });
};

export default checkSolvedStatus;
