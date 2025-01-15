import { WebAuthnSigner } from "@dfns/sdk-browser";
import Parse from "parse";

class ParseClient {
  private static instance: ParseClient;

  constuctor() {
    console.log("ParseClient constructor");
  }

  // Singleton getInstance method
  public static getInstance(): ParseClient {
    console.log("ParseClient getInstance");
    if (!ParseClient.instance) {
      console.log("ParseClient instance created");
      ParseClient.instance = new ParseClient();
    }
    return ParseClient.instance;
  }

  private initialize() {
    Parse.initialize(process.env.REACT_APP_PARSE_APPLICATION_ID || "", process.env.REACT_APP_PARSE_JAVASCRIPT_KEY);
    Parse.serverURL = process.env.REACT_APP_PARSE_SERVER_URL + "/parse" || "";
    Parse.javaScriptKey = process.env.REACT_APP_PARSE_JAVASCRIPT_KEY;

    // Middleware: Automatically use the session token (JWT) for all requests
    const sessionToken = localStorage.getItem("sessionToken");
    if (sessionToken) {
      Parse.User.become(sessionToken).catch((error) => {
        console.error("Error becoming user with sessionToken:", error);
      });
    }
  }

  /**
   * get a record from the parse database
   * @param collectionName
   * @param id
   * @returns
   */
  public async get(collectionName: string, id: string) {
    const Collection = Parse.Object.extend(collectionName);
    const query = new Parse.Query(Collection);
    query.equalTo("objectId", id);
    return query.first();
  }

  /**
   * get a record from the parse database
   * @param className
   * @param whereFields
   * @param whereValues
   * @param includesValues
   * @returns
   */
  public async getRecord(
    className: string,
    whereFields: string[] = [],
    whereValues: any[] = [],
    includesValues: any[] = []
  ): Promise<Parse.Object | undefined> {
    if (whereFields.length !== whereValues.length) {
      throw new Error("The number of whereFields and whereValues must match");
    }
    const query = new Parse.Query(className);
    whereFields.forEach((whereField, i) => query.equalTo(whereField, whereValues[i]));
    includesValues.forEach((includeValue) => query.include(includeValue));
    return await query.first();
  }

  /**
   * get a record from a particular blockchain
   * @param collection
   * @param networkId
   * @param idFields
   * @param idValueFields
   * @returns
   */
  public async getRecordWithBlockchain(collection: any, networkId: any, idFields: any = [], idValueFields: any = []) {
    try {
      const Blockchain = Parse.Object.extend("Blockchain");
      const bquery = new Parse.Query(Blockchain);
      bquery.equalTo("networkId", networkId);
      const query = new Parse.Query(collection);
      query.matchesQuery("network", bquery);
      idFields.forEach((idField: any, i: number) => query.equalTo(idField, idValueFields[i]));
      return await query.first({ useMasterKey: true });
    } catch (e) {
      console.log(
        `getRecordWithBlockchain: Error getting record with collection ${collection} and networkId ${networkId} and idFields ${idFields} and idValueFields ${idValueFields}`
      );
    }
  }

  public countRecords(collectionName: any, collectionIdFields: any, collectionIds: any) {
    try {
      const Collection = Parse.Object.extend(collectionName);
      const query = new Parse.Query(Collection);
      collectionIdFields.forEach((cif: any, i: number) => query.equalTo(cif, collectionIds[i]));
      return query.count({ useMasterKey: true });
    } catch (e) {
      console.log(
        `countRecords: Error counting records with collectionName ${collectionName} and collectionIdFields ${collectionIdFields} and collectionIds ${collectionIds}`
      );
    }
  }

  /**
   * get records from the parse database
   * @param className
   * @param whereFields
   * @param whereValues
   * @param include
   * @param limit
   * @param skip
   * @param order
   * @param orderDirection
   * @param nonNullFields
   * @returns
   * @constructor
   * @throws {Error} if the number of whereFields and whereValues do not match
   */
  public async getRecords(
    className: string,
    whereFields: string[] = [],
    whereValues: any[] = [],
    include: any[] = [],
    limit: number = 1000,
    skip: number = 0,
    order: string = "createdAt",
    orderDirection: string = "asc",
    nonNullFields: string[] = []
  ) {
    try {
      if (whereFields.length !== whereValues.length) {
        throw new Error("The number of whereFields and whereValues must match");
      }
      const query = new Parse.Query(className);
      for (let i = 0; i < whereFields.length; i++) {
        // filter out any undefined values
        query.equalTo(whereFields[i], whereValues[i]);
      }
      include.forEach((i: any) => query.include(i));

      nonNullFields.forEach((field: string) => {
        query.exists(field);
      });

      query.limit(limit);
      // order by direction
      if (orderDirection === "asc") {
        query.ascending(order);
      } else {
        query.descending(order);
      }

      const records = await query.find();
      return records;
    } catch (e) {
      console.log(`getRecords: Error getting records with className ${className} and whereFields ${whereFields} and whereValues ${whereValues}`);
    }
  }

  /**
   * get a record from the parse database
   * @param className
   * @param whereFields
   * @param whereValues
   * @returns
   * @constructor
   * @throws {Error} if the number of whereFields and whereValues do not match
   */
  public async getFirstRecord(className: string, whereFields: string[], whereValues: any[]) {
    try {
      if (whereFields.length !== whereValues.length) {
        throw new Error("The number of whereFields and whereValues must match");
      }
      const query = new Parse.Query(className);
      for (let i = 0; i < whereFields.length; i++) {
        query.equalTo(whereFields[i], whereValues[i]);
      }
      const record = await query.first();
      return record;
    } catch (e) {
      console.log(`getFirstRecord: Error getting record with className ${className} and whereFields ${whereFields} and whereValues ${whereValues}`);
    }
  }

  public async getLatestRecord(className: string, whereFields: string[], whereValues: any[]) {
    try {
      if (whereFields.length !== whereValues.length) {
        throw new Error("The number of whereFields and whereValues must match");
      }
      const query = new Parse.Query(className);
      for (let i = 0; i < whereFields.length; i++) {
        query.equalTo(whereFields[i], whereValues[i]);
      }
      query.descending("createdAt");
      const record = await query.first();
      return record;
    } catch (e) {
      console.log(`getLatestRecord: Error getting record with className ${className} and whereFields ${whereFields} and whereValues ${whereValues}`);
    }
  }

  /**
   * create or update a record in the parse database
   * @param collectionName
   * @param collectionIdFields
   * @param collectionIds
   * @param data
   * @returns {Promise<Parse.Object>}
   */
  public async createOrUpdateRecord(
    collectionName: any,
    collectionIdFields: any = [],
    collectionIds: any = [],
    data: any = {}
  ): Promise<Parse.Object | undefined> {
    const Collection = Parse.Object.extend(collectionName);
    const query = new Parse.Query(Collection);
    collectionIdFields.forEach((cif: any, i: number) => query.equalTo(cif, collectionIds[i]));
    let record: any;
    try {
      record = await query.first();
      if (record) {
        Object.keys(data).forEach((key: any, i: number) => (record as any).set(key, data[key]));
        return record.save();
      }
    } catch (e) {
      console.log("cannot create record", (e as any).message);
    }

    if (!record) {
      collectionIdFields.forEach((cif: any, i: number) => ((data as any)[cif] = collectionIds[i]));
      record = new Collection(data);
      return record.save();
    }
  }

  /**
   * update a record in the parse database
   * @param collectionName
   * @param collectionIdFields
   * @param collectionIds
   * @param data
   * @returns
   */
  public async updateExistingRecord(collectionName: any, collectionIdFields: any, collectionIds: any, data: any) {
    try {
      const Collection = Parse.Object.extend(collectionName);
      const query = new Parse.Query(Collection);
      collectionIdFields.forEach((cif: any, i: number) => query.equalTo(cif, collectionIds[i]));
      return query.first().then((record: any) => {
        if (record) {
          Object.keys(data).forEach((key: any, i: number) => record.set(key, data[key]));
          return record.save();
        } else {
          throw new Error("Record not found");
        }
      });
    } catch (e) {
      console.log(
        `updateExistingRecord: Error updating existing record with collectionName ${collectionName} and collectionIdFields ${collectionIdFields} and collectionIds ${collectionIds} and data ${data}`
      );
    }
  }

  /**
   * create a record in the parse database. Throws an error if the record already exists
   * @param collectionName
   * @param collectionIdFields
   * @param collectionIdsValues
   * @param data
   * @returns {Promise<Parse.Object>}
   */
  public async createRecord(
    collectionName: any,
    collectionIdFields: any = [],
    collectionIdsValues: any = [],
    data: any = {}
  ): Promise<Parse.Object | undefined> {
    try {
      const Collection = Parse.Object.extend(collectionName);
      const query = new Parse.Query(Collection);
      if (collectionIdFields.length > 0) {
        collectionIdFields.forEach((cif: any, i: number) => query.equalTo(cif, collectionIdsValues[i]));
        const record = await query.first();
        if (record) {
          throw new Error("Record already exists");
        } else {
          const newRecord = new Collection();
          return newRecord.save(data);
        }
      } else {
        const newRecord = new Collection();
        return newRecord.save(data);
      }
    } catch (e: any) {
      console.log(
        `createRecord: Error creating record with collectionName ${collectionName} and collectionIdFields ${collectionIdFields} and collectionIdsValues ${collectionIdsValues}  ${e.message}`
      );
    }
  }

  public async createRecords(
    collectionName: any,
    collectionIdFields: any = [],
    collectionIdsValues: any = [],
    data: any = {}
  ): Promise<Parse.Object | undefined> {
    try {
      const Collection = Parse.Object.extend(collectionName);
      const query = new Parse.Query(Collection);
      if (collectionIdFields.length > 0) {
        collectionIdFields.forEach((cif: any, i: number) => query.equalTo(cif, collectionIdsValues[i]));
        const record = await query.first();
        if (record) {
          throw new Error("Record already exists");
        } else {
          const newRecord = new Collection();
          return newRecord.save(data);
        }
      } else {
        const newRecord = new Collection();
        return newRecord.save(data);
      }
    } catch (e: any) {
      console.log(
        `createRecord: Error creating record with collectionName ${collectionName} and collectionIdFields ${collectionIdFields} and collectionIdsValues ${collectionIdsValues}  ${e.message}`
      );
    }
  }

  /**
   * delete a record in the parse database
   * @param collectionName
   * @param collectionId
   * @returns
   */
  public async deleteRecord(collectionName: any, collectionId: any) {
    try {
      const Collection = Parse.Object.extend(collectionName);
      const query = new Parse.Query(Collection);
      query.equalTo("objectId", collectionId);
      const record = await query.first({ useMasterKey: true });
      if (record) {
        return await record.destroy({ useMasterKey: true });
      }
    } catch (e) {
      console.log(`deleteRecord: Error deleting record with collectionName ${collectionName} and collectionId ${collectionId}: ${e}`);
    }
  }

  /**
   * save all record in the parse database
   * @param records
   */
  public async saveAll(records: any) {
    try {
      const allRecords = [];
      for (let i = 0; i < records.length; i++) {
        if (records[i] instanceof Parse.Object) {
          allRecords.push(records[i]);
        } else {
          allRecords.push(new Parse.Object(records[i].className, records[i]));
        }
      }
      for (let i = 0; i < allRecords.length; i++) {
        await allRecords[i].save(null);
        //saveAll: Saved record ${allRecords[i].attributes}
      }
    } catch (e) {
      console.log(`saveAll: Error saving records ${records}`);
    }
  }

  /**
   * save all record in the parse database
   * @param collectionName
   * @param records
   */
  public async saveAllFor(collectionName: string, records: any) {
    try {
      const allRecords = [];
      for (let i = 0; i < records.length; i++) {
        if (records[i] instanceof Parse.Object) {
          allRecords.push(records[i]);
        } else {
          allRecords.push(new Parse.Object(collectionName, records[i]));
        }
      }
      for (let i = 0; i < allRecords.length; i++) {
        await allRecords[i].save(null);
        //saveAllFor: Saved record ${allRecords[i]}
      }
    } catch (e) {
      console.log(`saveAllFoe: Error saving records ${records}`);
    }
  }

  /**
   * get a parse schema
   * @param className
   * @returns
   */
  public async getSchema(className: string) {
    try {
      const query = new Parse.Query("_SCHEMA");
      query.equalTo("className", className);
      return await query.first();
    } catch (e) {
      console.log(`getSchema: Error getting schema for ${className}`);
    }
  }

  /**
   * save a parse schema
   * @param schema
   * @returns
   */
  public async saveSchema(schema: any) {
    try {
      return await schema.save();
    } catch (e) {
      console.log(`saveSchema: Error saving schema ${schema}`);
    }
  }

  /**
   * create a parse schema
   * @param className
   * @param fields
   * @returns
   */
  public async createSchema(className: string, fields: any) {
    try {
      // get all the existing schemas
      const schemas = await this.getAllSchemas();

      // if the schema already exists, return
      if (!schemas) return;
      if (schemas.find((s: any) => s.className === className)) {
        return;
      }

      // to create a schema, we simply create an object of that class
      // then delete the object
      const Collection = Parse.Object.extend(className);
      const collection = new Collection();
      const fieldNames = Object.keys(fields);
      const fieldValues = fieldNames.map((fieldName) => {
        // check the field types and create an appropriate value
        const fieldType = fields[fieldName];
        switch (fieldType) {
          case "String":
            return "test";
          case "Number":
            return 1;
          case "Boolean":
            return true;
          case "GeoPoint":
            return new Parse.GeoPoint(0, 0);
          case "Polygon":
            return new Parse.Polygon([
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
            ]);
          case "Array":
            return ["test"];
          case "Object":
            return { test: "test" };
          default:
            return undefined;
        }
      });
      // set the field values
      fieldNames.forEach((fieldName, i) => {
        const fieldValue = fieldValues[i];
        if (!fieldValue) return;
        collection.set(fieldName, fieldValue);
      });

      // save the object
      await collection.save();

      // delete the object
      await collection.destroy();
    } catch (e) {
      console.log((e as any).message);
    }
  }

  /**
   * create multiple schemas
   * @param schemasList
   */
  public async createSchemas(schemasList: any) {
    const schemas = await this.getAllSchemas();
    const schemaNames = schemas.map((s: any) => s.className);
    for (let i = 0; i < schemasList.length; i++) {
      const collectionName = schemasList[i];
      if (!schemaNames.includes(collectionName)) {
        await this.createSchema(collectionName, {
          name: "string",
        });
      }
    }
  }

  /**
   * delete a collection and its schema
   * @param collectionName
   * @returns
   */
  public async deleteCollection(collectionName: string) {
    try {
      const query = new Parse.Query(collectionName);
      const records = await query.find();
      return await Parse.Object.destroyAll(records);
    } catch (e) {
      console.log(`deleteCollection: Error deleting collection ${collectionName}`);
    }
  }

  /**
   * delete a schema
   * @param className
   * @returns
   */
  public async deleteSchema(className: string) {
    try {
      const schema = await this.getSchema(className);
      return schema ? await schema.destroy() : undefined;
    } catch (e) {
      console.log(`deleteSchema: Error deleting schema for ${className}`);
    }
  }

  /**
   * get all schemas in the parse database
   */
  public async getAllSchemas() {
    try {
      return await Parse.Schema.all();
    } catch (e) {
      console.error("Error getting all schemas:", e);
      return [];
    }
  }

  /**
   * save a file to the parse database
   * @param name
   * @param data
   * @param type
   * @returns
   */
  public async saveFile(name: string, data?: any, type?: string) {
    const parseFile = new Parse.File(name, data, type);
    await parseFile.save({ useMasterKey: true });
    return parseFile;
  }

  /**
   * update a record in the parse database
   * @param collectionName
   * @param id
   * @param fields
   */
  public async updateRecord(collectionName: string | { className: string }, id: string, fields: { [x: string]: any }) {
    const Collection = Parse.Object.extend(collectionName);
    const collection = new Collection();
    collection.id = id;
    for (const key in fields) {
      collection.set(key, fields[key]);
    }
    await collection.save();
  }

  /**
   * createa a record in the parse database
   * @param collectionName
   * @param fields
   * @returns
   */
  public async create(collectionName: string, fields: { [x: string]: any }) {
    const Collection = Parse.Object.extend(collectionName);
    const collection = new Collection();
    for (const key in fields) {
      collection.set(key, fields[key]);
    }
    await collection.save();
    return collection;
  }

  /**
   * update a record in the parse database
   * @param collName
   * @param existingRecordId
   * @param objectToInsert
   * @returns
   */
  public async update(collName: string | { className: string }, existingRecordId: string, objectToInsert: { [x: string]: any }) {
    const Collection = Parse.Object.extend(collName);
    const collection = new Collection();
    collection.id = existingRecordId;
    for (const key in objectToInsert) {
      collection.set(key, objectToInsert[key]);
    }
    await collection.save();
    return collection;
  }

  /**
   * Run a Parse Cloud Function
   * @param cloudFunction - The name of the cloud function to run
   * @param params - An object containing parameters for the cloud function
   * @returns {Promise<any>}
   */
  public async run(cloudFunction: string, params: any = {}): Promise<any> {
    try {
      return await Parse.Cloud.run(cloudFunction, params);
    } catch (error: any) {
      console.error(`Error running cloud function "${cloudFunction}":`, error.message);
      throw error;
    }
  }

  /**
   * Log out the current user
   */
  public async logout(): Promise<void> {
    try {
      await Parse.User.logOut();
      console.log("User logged out successfully.");
    } catch (error: any) {
      console.error("Error logging out user:", error.message);
    }
  }

  public async initiateDfnsRegistration(username: string) {
    if (!username) {
      throw new Error("Username is required for registration.");
    }

    try {
      // Use Parse.Cloud.run to call registerInit
      const challenge = await Parse.Cloud.run("registerInit", { username });
      console.log("Received registration challenge:", challenge);

      return { challenge, error: null };
    } catch (error: any) {
      console.error("Error initiating registration:", error);
      return { challenge: null, error: error.message };
    }
  }
}

// Instantiate and export the singleton instance
export default ParseClient.getInstance();
