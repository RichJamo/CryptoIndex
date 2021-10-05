const DAPP_ADDRESS = "0xC0dB91699c3599ACDd39E28125BCAa380154Ecb7"; //insert the address I deployed to

const USDC_ADDRESS = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"

const WMATIC_ADDRESS = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"
const SUSHI_ADDRESS = "0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a"
const WETH_ADDRESS = "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"
const WBTC_ADDRESS = "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6"

const MATIC_USD_ORACLE = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
const SUSHI_USD_ORACLE = "0x49b0c695039243bbfeb8ecd054eb70061fd54aa0"
const ETH_USD_ORACLE = "0xF9680D99D6C9589e2a93a78A04A279e509205945"
const BTC_USD_ORACLE = "0xc907E116054Ad103354f2D350FD2514433D57F6f"

const QUICKSWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"
const SUSHISWAP_ROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"

var user;

const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()

const dappContract_signer = new ethers.Contract(DAPP_ADDRESS, sushi_index_abi, signer);
const dappContract_provider = new ethers.Contract(DAPP_ADDRESS, sushi_index_abi, provider);

/*****************************************/
/* Detect the MetaMask Ethereum provider */
/*****************************************/

//check that we are connected to Polygon network
var chainId = await checkNetworkId(provider)
if (chainId !== 137) {
  console.log("Please change to Polygon network") //TODO make this an alert to the user...
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x89' }], //137 in 0x padded hexadecimal form is 0x89
    });
    window.location.reload();
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask.
    if (error.code === 4902) {
      try {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{ chainId: '0x89', rpcUrl: 'https://rpc-mainnet.maticvigil.com/' /* ... */ }],
        });
      } catch (addError) {
        // handle "add" error
      }
    }
    // handle other "switch" errors
  }
}

if (provider) {
  startApp(provider); // Initialize your app
} else {
  console.log('Please install MetaMask!');
}

async function checkNetworkId(_provider) {
  try {
    var network = await provider.getNetwork();
    return network["chainId"];
  }
  catch (error) {
    console.log(error);
  }
}

async function startApp(provider) {
  const depositButton = document.getElementById('depositButton');
  const approveButton = document.getElementById('approveButton');

  const withdrawToUserButton = document.getElementById('withdraw_BB_to_user');

  const accounts = await ethereum.request({ method: 'eth_accounts' });
  user = accounts[0];

  await displayBalances();

  await displayUSDBalances();

  approveButton.addEventListener('click', async () => {
    var depositAmountUSDC = $("#depositAmountUSDC").val(); //put in some checks here? positive number, between x and y, user has enough funds...
    await giveApprovalFromUser(USDC_ADDRESS, DAPP_ADDRESS, ethers.utils.parseUnits(depositAmountUSDC.toString(), 6));
  })

  depositButton.addEventListener('click', async () => {
    var depositAmountUSDC = $("#depositAmountUSDC").val(); //put in some checks here? positive number, between x and y, user has enough funds...
    console.log(`Depositing ${depositAmountUSDC} of USDC to the SushiIndex account`);
    $("#swapStarted").css("display", "block");
    $("#swapStarted").text(`Depositing ${depositAmountUSDC} of USDC to the Polygon Index account`);
    var array_coins = await getTokenInfo(DAPP_ADDRESS);
    var WMATIC_balanceInUSD = array_coins[0].usd_balance;
    console.log(WMATIC_balanceInUSD);
    var SUSHI_balanceInUSD = array_coins[1].usd_balance;
    console.log(SUSHI_balanceInUSD);
    var WETH_balanceInUSD = array_coins[2].usd_balance;
    console.log(WETH_balanceInUSD);
    var WBTC_balanceInUSD = array_coins[3].usd_balance;
    console.log(WBTC_balanceInUSD);

    var total_in_USD = WMATIC_balanceInUSD + SUSHI_balanceInUSD + WETH_balanceInUSD + WBTC_balanceInUSD;
    if (total_in_USD > 0) {
      //var estimatedGasLimit = await dappContract_signer.estimateGas.depositUserFunds(depositAmountUSDC * 10 ** 6, USDC_ADDRESS, user, DAPP_ADDRESS);
      await dappContract_signer.depositUserFunds(depositAmountUSDC * 10 ** 6,
        USDC_ADDRESS,
        user,
        parseInt(WMATIC_balanceInUSD * 10 ** 6),
        parseInt(SUSHI_balanceInUSD * 10 ** 6),
        parseInt(WETH_balanceInUSD * 10 ** 6),
        parseInt(WBTC_balanceInUSD * 10 ** 6))
      //{ gasLimit: parseInt(estimatedGasLimit * 1.2) });
    } else {
      dappContract_signer.depositFirstTime (depositAmountUSDC * 10 ** 6, USDC_ADDRESS, user);
    }
  })

  withdrawToUserButton.addEventListener('click', async () => {
    //put in gas estimation here
    await dappContract_signer.withdrawUserFunds(user);
  })
}

async function displayBalances() {
  getWMATICResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(WMATIC_ADDRESS, DAPP_ADDRESS), 18)).toFixed(6) || 'Not able to get accounts';

  getSUSHIResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(SUSHI_ADDRESS, DAPP_ADDRESS), 18)).toFixed(6) || 'Not able to get accounts';

  getWBTCResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(WBTC_ADDRESS, DAPP_ADDRESS), 8)).toFixed(6) || 'Not able to get accounts';

  getWETHResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(WETH_ADDRESS, DAPP_ADDRESS), 18)).toFixed(6) || 'Not able to get accounts';
}

async function displayUSDBalances() {
  var array_coins = await getTokenInfo(DAPP_ADDRESS);
  var wmatic_usd = array_coins[0].usd_balance;
  WMATICInUsd.innerHTML = wmatic_usd.toFixed(2) || 'Not able to get accounts'; //8 decimals for oracle input, 18 for WMATIC
  var sushi_usd = array_coins[1].usd_balance;
  SUSHIInUsd.innerHTML = sushi_usd.toFixed(2) || 'Not able to get accounts';
  var wbtc_usd = array_coins[2].usd_balance;
  WBTCInUsd.innerHTML = wbtc_usd.toFixed(2) || 'Not able to get accounts';
  var weth_usd = array_coins[3].usd_balance;
  WETHInUsd.innerHTML = weth_usd.toFixed(2) || 'Not able to get accounts';

  var total_in_usd = wmatic_usd + sushi_usd + wbtc_usd + weth_usd;
  TotalInUSD.innerHTML = '$ ' + total_in_usd.toFixed(2);

  var userShares = (await dappContract_provider.getUserShares(user)).toNumber()
  var totalShares = (await dappContract_provider.totalNumberOfShares()).toNumber() //lesson here - overwriting public variable getter function??
  UserShareInPerc.innerHTML = (userShares / totalShares * 100).toFixed(1) + '%'; //can add a percentage thingie here!
  USERshareInUSD.innerHTML = '$ ' + (userShares / totalShares * total_in_usd).toFixed(2); //TODO - neaten up this fix
}

async function getTokenInfo(accountOrContract) {

  function Coin(symbol, address, oracleAddress, decimals, balance, usd_balance, diff_from_average, usd_exchange_rate) { //in JS we create an object type by using a constructor function
    this.symbol = symbol;
    this.address = address;
    this.oracleAddress = oracleAddress;
    this.decimals = decimals;
    this.balance = balance;
    this.usd_balance = usd_balance;
    this.diff_from_average = diff_from_average;
    this.usd_exchange_rate = usd_exchange_rate;
  }

  //create a coin object for each of our 4 assets
  var WMATIC = new Coin("WMATIC", WMATIC_ADDRESS, ONE_USD_ORACLE);
  var SUSHI = new Coin("SUSHI", SUSHI_ADDRESS, SUSHI_USD_ORACLE);
  var WBTC = new Coin("WBTC", WBTC_ADDRESS, WBTC_USD_ORACLE);
  var WETH = new Coin("WETH", WETH_ADDRESS, ETH_USD_ORACLE);

  var array_coins = [WMATIC, SUSHI, WBTC, WETH];
  var total_in_usd = 0;

  for (let coin of array_coins) {
    coin.balance = await getBalance(coin.address, accountOrContract);
    coin.usd_exchange_rate = await getExchangeRate(coin.oracleAddress);
    coin.decimals = await getDecimals(coin.address);
    coin.usd_balance = parseFloat(
      (parseFloat(
        ethers.utils.formatUnits(coin.balance, coin.decimals))
        * parseFloat(ethers.utils.formatUnits(coin.usd_exchange_rate, 8)
        ))
        .toFixed(6)
    );
    total_in_usd += coin.usd_balance;
  }

  var no_of_assets = array_coins.length;
  var target_per_asset = total_in_usd / no_of_assets;
  for (let coin of array_coins) {
    coin.diff_from_average = coin.usd_balance - target_per_asset;
  }

  return array_coins;
}

async function giveApprovalFromUser(token_address, router_address, amountIn) {
  // create a new instance of a contract
  var tokenContract = new ethers.Contract(token_address, token_abi, signer)
  // give router_address approval to spend user's tokens
  try {
    var approved = await tokenContract.approve(router_address, amountIn); //approve(spender, amount)
    return approved;

  } catch (error) {
    console.log(error)
  }
}

async function getBalance(token_address, accountOrContract) {
  var tokenContract = new ethers.Contract(token_address, token_abi, provider)
  try {
    var token_balance = await tokenContract.balanceOf(accountOrContract);//need to catch an error here - perhaps make this it's own function!
    return token_balance;
  } catch (error) {
    console.log(error)
  }
}

// async function getExchangeRate(oracle_address) {
//   const provider_testnet = new ethers.getDefaultProvider("https://api.s0.b.hmny.io");
//   const aggregatorV3InterfaceABI = [{ "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "description", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint80", "name": "_roundId", "type": "uint80" }], "name": "getRoundData", "outputs": [{ "internalType": "uint80", "name": "roundId", "type": "uint80" }, { "internalType": "int256", "name": "answer", "type": "int256" }, { "internalType": "uint256", "name": "startedAt", "type": "uint256" }, { "internalType": "uint256", "name": "updatedAt", "type": "uint256" }, { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "latestRoundData", "outputs": [{ "internalType": "uint80", "name": "roundId", "type": "uint80" }, { "internalType": "int256", "name": "answer", "type": "int256" }, { "internalType": "uint256", "name": "startedAt", "type": "uint256" }, { "internalType": "uint256", "name": "updatedAt", "type": "uint256" }, { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "version", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }];
//   const addr = oracle_address;
//   const priceFeed = new ethers.Contract(addr, aggregatorV3InterfaceABI, provider_testnet);

//   try {
//     var result = await priceFeed.latestRoundData();
//     console.log("Latest Round Data", result[1]);
//     return result[1]; //returns in BigNumber format
//   } catch (error) {
//     console.log(error);
//   }
// }

async function getExchangeRate(oracle_address) {
  var oracle = new ethers.Contract(oracle_address, CHAINLINK_ORACLE_ABI, provider);
  try {
    var exchangeRate = await oracle.latestAnswer();
    return exchangeRate; //returns in BigNumber format
  } catch (error) {
    console.log(error);
  }
}

async function getDecimals(token_address) {
  var tokenContract = new ethers.Contract(token_address, token_abi, provider)
  // check how many decimals that token has
  try {
    var decimals = await tokenContract.decimals();//need to catch an error here - perhaps make this it's own function!
    return decimals;
  } catch (error) {
    console.log(error);
  }
}





