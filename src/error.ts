export class SocketResponseError extends Error {
    constructor(message: string, private code: string = '') {
        super(message);
    }
}
