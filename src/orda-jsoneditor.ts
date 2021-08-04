import {Client} from "@orda-io/orda/dist/client";
import type {JSONEditorOptions} from 'jsoneditor'
import JSONEditor, {EditableNode} from "jsoneditor";
import {OrdaLogger, OrdaLoggerFactory, OrdaLogLevel} from "@orda-io/orda-logger";
import {ClientHandlers, DatatypeHandlers, OrdaDatatype, OrdaDoc, StateOfDatatype} from "@orda-io/orda";
import {DatatypeError} from "@orda-io/orda/dist/errors/for_handlers";
import {Operation} from "@orda-io/orda/dist/operations/operation";
import * as JSONPatch from "json8-patch";

export class OrdaJSONEditor implements ClientHandlers, DatatypeHandlers {
    private client: Client;
    private readonly key: string;
    private readonly option: JSONEditorOptions;
    private jsonEditor: JSONEditor;
    private logger: OrdaLogger;
    private ordaDoc?: OrdaDoc;
    private previous: unknown;

    constructor(client: Client, key: string, container: HTMLElement) {
        this.key = key;
        this.logger = new OrdaLoggerFactory(OrdaLogLevel.INFO).getLogger(this.key);
        this.client = client;
        this.client.setHandlers(this);
        this.option = {
            mode: "tree",
            modes: ["code", "form", "text", "tree", "view", "preview"], // allowed modes
            name: key,
            statusBar: true,
            sortObjectKeys: true,
            onError: this.onEditorError,
            onEvent: this.onEditorEvent,
            onChangeJSON: this.onChangeJSON,
            // onChangeText: this.onChangeText
        }
        this.jsonEditor = new JSONEditor(container, this.option);
        this.previous = {};
        if (!client.isConnected()) {
            client.connect();
        }
    }

    private onEditorError: ((error: Error) => void) = (err) => {
        alert(err.toString());
    };

    onClientConnect(client: Client): void {
        this.logger.info(`orda Client connected: ${client.isConnected()}`);
        this.ordaDoc = client.subscribeOrCreateDocument(this.key, this);
    }

    onClientError(client: Client, e: Error): void {
        this.logger.error(`client error: ${e}`);
    }

    onDatatypeStateChange(dt: OrdaDatatype, oldState: StateOfDatatype, newState: StateOfDatatype): void {
        this.logger.info(`stateChange: ${oldState}=>${newState}`);
        if (newState == StateOfDatatype.SUBSCRIBED) {
            const json = (dt as OrdaDoc).getValue();
            this.logger.info(`${JSON.stringify(json)}`);
            this.jsonEditor.set(json);
        }
    }

    onDatatypeErrors = (dt: OrdaDatatype, ...errs: DatatypeError[]) => {

    }

    onDatatypeRemoteChange(dt: OrdaDatatype, opList: Operation[]): void {
        this.logger.info(`${JSON.stringify(opList)}`);
        this.jsonEditor.set(this.ordaDoc?.getValue());
        this.jsonEditor.expandAll();
    }

    private onChangeJSON = (json: any) => {
        // this.previous = this.ordaDoc?.getValue();

        this.logger.info(`onChangeJSON: ${JSON.stringify(this.previous)} => ${JSON.stringify(json)}`)

        const fromOrdaDoc = this.ordaDoc?.getValue();
        const patchList = JSONPatch.diff(fromOrdaDoc, json);
        patchList.forEach((patch) => {
            this.logger.info(`patch:${JSON.stringify(patch)}`);
            switch (patch.op) {
                case 'add':
                    if (patch.value !== '' && !patch.path.endsWith(`/`)) {
                        this.logger.info(`ADD: ${JSON.stringify(patch)}`);
                        this.ordaDoc?.patch(patch);
                        // this.previous = json;
                    }
                    break;
                case 'remove':
                    if (!patch.path.endsWith('/')) {
                        this.logger.info(`REMOVE: ${JSON.stringify(patch)}`);
                        this.ordaDoc?.patch(patch);
                    }
                    break;
                case 'replace':
                    if (patch.value !== '' && !patch.path.endsWith(`/`)) {
                        this.logger.info(`REPLACE: ${JSON.stringify(patch)}`);
                        this.ordaDoc?.patch(patch);
                    }
                    break;
                case 'copy':
                case 'move':
            }
            const keys = patch.path.split('/');

        });
    }
    // private onChangeText = (jsonStr:any) => {
    //     this.logger.info(`onChangeText: ${JSON.stringify(jsonStr)}`)
    // }

    private onEditorEvent: (node: EditableNode, event: any) => void = (node, event) => {

        return;
        // switch (event.constructor.name) {
        //     case 'MouseEvent':
        //     case 'KeyboardEvent':
        //     case 'InputEvent':
        //         return;
        //     case 'FocusEvent':
        //         if (event.type === 'blur' && node.value !== undefined) {
        //             break;
        //         }
        //         return;
        //     case 'Event':
        //         if (event.type === 'change' && node.value !== undefined) {
        //             break;
        //         }
        //         return;
        // }
        this.logger.info(`${event.constructor.name} - ${JSON.stringify(node)} - ${event.type}`);

        // if (event.type === "blur") {
        //     if ((node.field !== "") && !(node.value === undefined || node === "")) {
        //         let targetJSON = jsonDoc;
        //         for (let i = 0; i < node.path.length - 1; i++) {
        //             const idx = node.path[i];
        //             if (idx instanceof string) {
        //                 targetJSON = targetJSON.getFromObject(idx);
        //             } else if (idx instanceof Number) {
        //                 targetJSON = targetJSON.getFromArray(idx);
        //             }
        //             console.log(JSON.stringify(targetJSON.toJSON()));
        //         }
        //         if (targetJSON.getTypeOfJSON() === orda.TypeOfJSON.object) {
        //             targetJSON.putToObject(node.field, node.value);
        //         }
        //     }
        // }
    };

}