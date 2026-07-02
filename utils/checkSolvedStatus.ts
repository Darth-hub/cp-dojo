import { CodeforcesSubmission } from "@/types/Codeforces";
import { SessionProblem } from "@/types/SessionProblem";

const checkSolvedStatus = (
  sessionProblems: SessionProblem[],
  submissions: CodeforcesSubmission[],
): SessionProblem[] => {
  return sessionProblems.map((problem) => {
    // solved is permanent — never downgraded by a later WA
    if (problem.status === "solved") return problem;

    // all submissions for this specific problem, most recent first
    const matches = submissions.filter(
      (s) =>
        s.problem.contestId === problem.contest_id &&
        s.problem.index === problem.index,
    );

    if (matches.length === 0) {
      return { ...problem, status: "none" };
    }

    const solved = matches.find((s) => s.verdict === "OK");
    if (solved) {
      return {
        ...problem,
        status: "solved",
        solved_time: solved.creationTimeSeconds * 1000,
      };
    }

    const testing = matches.find(
      (s) => s.verdict === "TESTING" || s.verdict === undefined,
    );
    if (testing) {
      return { ...problem, status: "testing" };
    }

    // has submissions, none OK or in-queue -> wrong
    return { ...problem, status: "wrong" };
  });
};

export default checkSolvedStatus;