export const resolveScalarOrFunction = async <T>(value: T | (() => Promise<T>)): Promise<T> => {
    if (typeof value === 'function')
        return await (value as () => Promise<T>)();
    return value;
}

export const formatDuration = (value: number) => {
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value - minutes * 60);
    let result = `${`${minutes}`.padStart(2, '0')}:${`${seconds}`.padStart(2, '0')}`;
    if (hours)
        result = `${hours}` + result;
    return result
}
