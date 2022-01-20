import { increaseIndentPattern } from "../../indentPattern";

function checkIndent(indentPattern: RegExp, result: boolean) {
  return (text: string) => expect(indentPattern.test(text)).toEqual(result);
}

function checkFunctions(indentPattern: RegExp) {
  return [checkIndent(indentPattern, true), checkIndent(indentPattern, false)];
}

describe("IncreaseIndentPattern Test Suite", () => {
  const [checkIncrease, checkNotIncrease] = checkFunctions(
    increaseIndentPattern()
  );

  test("Scala3", () => {
    // after the closing ) of a condition in an old-style if or while.
    checkIncrease("if (x < 0)");
    checkIncrease("if (x < 0)          ");
    checkIncrease("while (x < 0)");
    checkIncrease("extension (str: String)");
    checkNotIncrease("if (x < 0");
    checkNotIncrease("if (x < 0) (not possible code)");
    checkNotIncrease("while (x < 0) (not possible code)");

    // keywords that can end
    checkIncrease("if");
    checkIncrease("while");
    checkIncrease("for");
    checkIncrease("match");
    checkIncrease("try");
    checkNotIncrease("end if");

    // if-then
    checkIncrease("if (x < 0) then");
    checkNotIncrease("if (x < 0) then {code}");

    // keywords
    checkIncrease("{some code} =>");
    checkIncrease("{some code} <-");
    checkIncrease("{some code} catch");
    checkIncrease("{some code} do");
    checkIncrease("{some code} else");
    checkIncrease("{some code} finally");
    checkIncrease("{some code} for");
    checkIncrease("{some code} if");
    checkIncrease("{some code} return");
    checkIncrease("{some code} then");
    checkIncrease("{some code} throw");
    checkIncrease("{some code} try");
    checkIncrease("{some code} while");
    checkIncrease("{some code} yield");

    checkNotIncrease("{some code} yield {some other code}");
  });
});
