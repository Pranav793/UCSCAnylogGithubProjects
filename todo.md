**Login / logout Bug**:
1. logout of remote-cli
2. log back in

Expect: Success into http://23.239.12.151:3001
Actual: goes to http://23.239.12.151:3001/dashboard/client
Error: Error code: 404
Message: File not found.
Error code explanation: 404 - Nothing matches the given URI.


**Query Builder**: 

1. **Aggregation + Non-aggregation**: Can we support doing queries that contain both aggregation and none-aggregation? 
Right now we can do either one or the other. Note, when doing aggregation with none-aggregation `GROUP BY` is required. 

```
SELECT member_id, count(*) from my_table GROUP BY member_id 
```

2. In advanced: We're missing the `ORDER BY` function

3.  When running the Remote-CLI in the cloud the copy button does not work. I'm willing to guess that this has to do 
with memory location for copy. I suggest adding a button in the _Client_ section that allows to paste. 

I can show you what Grafana does to resolve this issue 

4. Moshe wants you to integrate the QR and Sample cURL request example based on the query. The source code for that 
can be found [here](https://github.com/AnyLog-co/Remote-CLI/blob/master/djangoProject/views.py). 


