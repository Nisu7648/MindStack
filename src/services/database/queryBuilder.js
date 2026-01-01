/**
 * QUERY BUILDER
 * Fluent interface for building SQL queries
 * 
 * Features:
 * - SELECT, INSERT, UPDATE, DELETE
 * - WHERE conditions
 * - JOIN operations
 * - ORDER BY, GROUP BY
 * - LIMIT, OFFSET
 * - Aggregations
 * - Subqueries
 */

import databaseService from './databaseService';

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.selectFields = ['*'];
    this.whereConditions = [];
    this.joinClauses = [];
    this.orderByFields = [];
    this.groupByFields = [];
    this.limitValue = null;
    this.offsetValue = null;
    this.params = [];
  }

  /**
   * SELECT
   */
  select(...fields) {
    this.selectFields = fields.length > 0 ? fields : ['*'];
    return this;
  }

  /**
   * WHERE
   */
  where(field, operator, value) {
    if (arguments.length === 2) {
      value = operator;
      operator = '=';
    }
    
    this.whereConditions.push({
      type: 'AND',
      field,
      operator,
      value
    });
    
    return this;
  }

  /**
   * OR WHERE
   */
  orWhere(field, operator, value) {
    if (arguments.length === 2) {
      value = operator;
      operator = '=';
    }
    
    this.whereConditions.push({
      type: 'OR',
      field,
      operator,
      value
    });
    
    return this;
  }

  /**
   * WHERE IN
   */
  whereIn(field, values) {
    this.whereConditions.push({
      type: 'AND',
      field,
      operator: 'IN',
      value: values
    });
    
    return this;
  }

  /**
   * WHERE NOT IN
   */
  whereNotIn(field, values) {
    this.whereConditions.push({
      type: 'AND',
      field,
      operator: 'NOT IN',
      value: values
    });
    
    return this;
  }

  /**
   * WHERE NULL
   */
  whereNull(field) {
    this.whereConditions.push({
      type: 'AND',
      field,
      operator: 'IS NULL',
      value: null
    });
    
    return this;
  }

  /**
   * WHERE NOT NULL
   */
  whereNotNull(field) {
    this.whereConditions.push({
      type: 'AND',
      field,
      operator: 'IS NOT NULL',
      value: null
    });
    
    return this;
  }

  /**
   * WHERE BETWEEN
   */
  whereBetween(field, min, max) {
    this.whereConditions.push({
      type: 'AND',
      field,
      operator: 'BETWEEN',
      value: [min, max]
    });
    
    return this;
  }

  /**
   * WHERE LIKE
   */
  whereLike(field, pattern) {
    this.whereConditions.push({
      type: 'AND',
      field,
      operator: 'LIKE',
      value: pattern
    });
    
    return this;
  }

  /**
   * JOIN
   */
  join(table, firstField, operator, secondField) {
    if (arguments.length === 3) {
      secondField = operator;
      operator = '=';
    }
    
    this.joinClauses.push({
      type: 'INNER',
      table,
      firstField,
      operator,
      secondField
    });
    
    return this;
  }

  /**
   * LEFT JOIN
   */
  leftJoin(table, firstField, operator, secondField) {
    if (arguments.length === 3) {
      secondField = operator;
      operator = '=';
    }
    
    this.joinClauses.push({
      type: 'LEFT',
      table,
      firstField,
      operator,
      secondField
    });
    
    return this;
  }

  /**
   * RIGHT JOIN
   */
  rightJoin(table, firstField, operator, secondField) {
    if (arguments.length === 3) {
      secondField = operator;
      operator = '=';
    }
    
    this.joinClauses.push({
      type: 'RIGHT',
      table,
      firstField,
      operator,
      secondField
    });
    
    return this;
  }

  /**
   * ORDER BY
   */
  orderBy(field, direction = 'ASC') {
    this.orderByFields.push({ field, direction: direction.toUpperCase() });
    return this;
  }

  /**
   * GROUP BY
   */
  groupBy(...fields) {
    this.groupByFields = fields;
    return this;
  }

  /**
   * LIMIT
   */
  limit(value) {
    this.limitValue = value;
    return this;
  }

  /**
   * OFFSET
   */
  offset(value) {
    this.offsetValue = value;
    return this;
  }

  /**
   * COUNT
   */
  async count(field = '*') {
    this.selectFields = [`COUNT(${field}) as count`];
    const result = await this.get();
    return result.success ? result.data[0].count : 0;
  }

  /**
   * SUM
   */
  async sum(field) {
    this.selectFields = [`SUM(${field}) as sum`];
    const result = await this.get();
    return result.success ? result.data[0].sum : 0;
  }

  /**
   * AVG
   */
  async avg(field) {
    this.selectFields = [`AVG(${field}) as avg`];
    const result = await this.get();
    return result.success ? result.data[0].avg : 0;
  }

  /**
   * MAX
   */
  async max(field) {
    this.selectFields = [`MAX(${field}) as max`];
    const result = await this.get();
    return result.success ? result.data[0].max : null;
  }

  /**
   * MIN
   */
  async min(field) {
    this.selectFields = [`MIN(${field}) as min`];
    const result = await this.get();
    return result.success ? result.data[0].min : null;
  }

  /**
   * Build SELECT Query
   */
  buildSelectQuery() {
    this.params = [];
    
    let query = `SELECT ${this.selectFields.join(', ')} FROM ${this.table}`;

    // JOIN
    if (this.joinClauses.length > 0) {
      for (const join of this.joinClauses) {
        query += ` ${join.type} JOIN ${join.table} ON ${join.firstField} ${join.operator} ${join.secondField}`;
      }
    }

    // WHERE
    if (this.whereConditions.length > 0) {
      const whereParts = [];
      
      for (let i = 0; i < this.whereConditions.length; i++) {
        const condition = this.whereConditions[i];
        const connector = i === 0 ? '' : ` ${condition.type} `;
        
        if (condition.operator === 'IN' || condition.operator === 'NOT IN') {
          const placeholders = condition.value.map(() => '?').join(', ');
          whereParts.push(`${connector}${condition.field} ${condition.operator} (${placeholders})`);
          this.params.push(...condition.value);
        } else if (condition.operator === 'IS NULL' || condition.operator === 'IS NOT NULL') {
          whereParts.push(`${connector}${condition.field} ${condition.operator}`);
        } else if (condition.operator === 'BETWEEN') {
          whereParts.push(`${connector}${condition.field} BETWEEN ? AND ?`);
          this.params.push(condition.value[0], condition.value[1]);
        } else {
          whereParts.push(`${connector}${condition.field} ${condition.operator} ?`);
          this.params.push(condition.value);
        }
      }
      
      query += ` WHERE ${whereParts.join('')}`;
    }

    // GROUP BY
    if (this.groupByFields.length > 0) {
      query += ` GROUP BY ${this.groupByFields.join(', ')}`;
    }

    // ORDER BY
    if (this.orderByFields.length > 0) {
      const orderParts = this.orderByFields.map(
        o => `${o.field} ${o.direction}`
      );
      query += ` ORDER BY ${orderParts.join(', ')}`;
    }

    // LIMIT
    if (this.limitValue !== null) {
      query += ` LIMIT ${this.limitValue}`;
    }

    // OFFSET
    if (this.offsetValue !== null) {
      query += ` OFFSET ${this.offsetValue}`;
    }

    return query;
  }

  /**
   * Execute SELECT Query
   */
  async get() {
    try {
      const query = this.buildSelectQuery();
      const result = await databaseService.executeQuery(query, this.params);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      const rows = [];
      for (let i = 0; i < result.result.rows.length; i++) {
        rows.push(result.result.rows.item(i));
      }

      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get First Row
   */
  async first() {
    this.limit(1);
    const result = await this.get();
    return result.success && result.data.length > 0
      ? { success: true, data: result.data[0] }
      : { success: false, data: null };
  }

  /**
   * Find by ID
   */
  async find(id) {
    return this.where('id', id).first();
  }

  /**
   * INSERT
   */
  async insert(data) {
    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = fields.map(() => '?').join(', ');

      const query = `INSERT INTO ${this.table} (${fields.join(', ')}) VALUES (${placeholders})`;
      
      const result = await databaseService.executeQuery(query, values);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        insertId: result.result.insertId
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * INSERT Multiple
   */
  async insertMany(dataArray) {
    try {
      const queries = dataArray.map(data => {
        const fields = Object.keys(data);
        const values = Object.values(data);
        const placeholders = fields.map(() => '?').join(', ');
        
        return {
          query: `INSERT INTO ${this.table} (${fields.join(', ')}) VALUES (${placeholders})`,
          params: values
        };
      });

      const result = await databaseService.executeTransaction(queries);
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * UPDATE
   */
  async update(data) {
    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      
      const setParts = fields.map(field => `${field} = ?`);
      
      let query = `UPDATE ${this.table} SET ${setParts.join(', ')}`;
      
      const params = [...values];

      // WHERE
      if (this.whereConditions.length > 0) {
        const whereParts = [];
        
        for (let i = 0; i < this.whereConditions.length; i++) {
          const condition = this.whereConditions[i];
          const connector = i === 0 ? '' : ` ${condition.type} `;
          
          whereParts.push(`${connector}${condition.field} ${condition.operator} ?`);
          params.push(condition.value);
        }
        
        query += ` WHERE ${whereParts.join('')}`;
      }

      const result = await databaseService.executeQuery(query, params);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        rowsAffected: result.result.rowsAffected
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * DELETE
   */
  async delete() {
    try {
      let query = `DELETE FROM ${this.table}`;
      const params = [];

      // WHERE
      if (this.whereConditions.length > 0) {
        const whereParts = [];
        
        for (let i = 0; i < this.whereConditions.length; i++) {
          const condition = this.whereConditions[i];
          const connector = i === 0 ? '' : ` ${condition.type} `;
          
          whereParts.push(`${connector}${condition.field} ${condition.operator} ?`);
          params.push(condition.value);
        }
        
        query += ` WHERE ${whereParts.join('')}`;
      }

      const result = await databaseService.executeQuery(query, params);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        rowsAffected: result.result.rowsAffected
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Truncate Table
   */
  async truncate() {
    try {
      const query = `DELETE FROM ${this.table}`;
      const result = await databaseService.executeQuery(query);
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if Exists
   */
  async exists() {
    const count = await this.count();
    return count > 0;
  }

  /**
   * Paginate
   */
  async paginate(page = 1, perPage = 10) {
    try {
      // Get total count
      const totalCount = await this.count();
      
      // Calculate pagination
      const totalPages = Math.ceil(totalCount / perPage);
      const offset = (page - 1) * perPage;
      
      // Get data
      this.limit(perPage).offset(offset);
      const result = await this.get();
      
      if (!result.success) {
        return result;
      }

      return {
        success: true,
        data: result.data,
        pagination: {
          currentPage: page,
          perPage,
          totalPages,
          totalCount,
          hasMore: page < totalPages
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Chunk
   */
  async chunk(size, callback) {
    try {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const result = await this.paginate(page, size);
        
        if (!result.success) {
          return result;
        }

        await callback(result.data, page);
        
        hasMore = result.pagination.hasMore;
        page++;
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Raw Query
   */
  static async raw(query, params = []) {
    return await databaseService.executeQuery(query, params);
  }
}

/**
 * Create Query Builder Instance
 */
const table = (tableName) => new QueryBuilder(tableName);

export default QueryBuilder;
export { table };
