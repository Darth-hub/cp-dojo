// get problems and all submissions of a user 
import cfFetch from "@/lib/codeforces";
import { CodeforcesProblem, CodeforcesSubmission } from "@/types/Codeforces";
import { SuccessResponse, ErrorResponse, Response } from "@/types/Response";

const FILTERED_CONTEST_IDS = [
  171, 290, 409, 784, 952, 1145, 1171, 1170, 1212, 1211, 1298, 1297, 1331, 1347,
  1346, 1489, 1488, 1505, 1532, 1533, 1570, 1571, 1663, 1812, 1911, 1910, 1952,
  1959, 1958, 2012, 2011, 1001, 1002, 1115, 1116, 1356, 1357,
];

const getAllProblems = async (): Promise<Response<CodeforcesProblem[]>> => {
  try {
    const result = await cfFetch("problemset.problems");
    const problems = result.problems
      .filter((p: CodeforcesProblem) => p.contestId >= 600)
      .filter(
        (p: CodeforcesProblem) => !FILTERED_CONTEST_IDS.includes(p.contestId),
      );
    return SuccessResponse(problems);
  } catch (error) {
    return ErrorResponse((error as Error).message);
  }
};

const getSubmissions = async (
  handle: string,
  count: number = 10,
): Promise<Response<CodeforcesSubmission[]>> => {
  try {
    const result = await cfFetch(
      `user.status?handle=${handle}&from=1&count=${count}`,
    );
    return SuccessResponse(result);
  } catch (error) {
    return ErrorResponse((error as Error).message);
  }
};

export { getAllProblems, getSubmissions };
