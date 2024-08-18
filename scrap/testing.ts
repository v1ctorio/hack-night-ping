const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday","sunday",]; 

function parseDays(days: number): Array<string> {
    const result = [];
    for ( let i = 0; i < WEEKDAYS.length; i++) {
        if (days & (1 << i)) {
            result.push(WEEKDAYS[i]);
        }
    }
    return result
}

console.log(parseDays(0b1)); // ["monday"]
console.log(parseDays(0b10)); // ["tuesday"]
console.log(parseDays(0b11)); // ["monday", "tuesday"]
console.log(parseDays(0b1000000)); // ["sunday"]
