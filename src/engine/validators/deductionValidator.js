export const validateDeduction = (puzzle, attempt) => {
    const people = puzzle.payload?.people;
    const pets = puzzle.payload?.pets;
    const solution = puzzle.payload?.solution;
    if (!Array.isArray(people) || !Array.isArray(pets) || !Array.isArray(solution)) {
        return { ok: false, reasons: ['Invalid puzzle data'] };
    }

    if (!Array.isArray(attempt) || attempt.length !== people.length) {
        return { ok: false, reasons: ['Complete all assignments'] };
    }

    const unique = new Set(attempt);
    if (unique.size !== people.length) {
        return { ok: false, reasons: ['Each pet can be used once'] };
    }

    for (const pet of attempt) {
        if (!pets.includes(pet)) {
            return { ok: false, reasons: ['Invalid assignment value'] };
        }
    }

    for (let i = 0; i < solution.length; i++) {
        if (attempt[i] !== solution[i]) {
            return { ok: false, reasons: ['Assignments are incorrect'] };
        }
    }

    return { ok: true };
};
