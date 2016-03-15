function present(name) { return a("symbolicname").eq(name); }
function notpresent(name) {return a("symbolicname").neq(name); }


present("hive.replication.central.*")
  .or(present("hive.commons.com.typesafe.scalalogging"))
  .or(present("hive.commons.db"))
  .or(present("hive.commons.configuration"))
  .or(present("hive.commons.serialization"))
  .or(present("hive.commons.utils"))
  .or(present("hive.commons.json4s"))
  .or(present("hive.commons.korro"))
  .or(present("hive.commons.akka"))